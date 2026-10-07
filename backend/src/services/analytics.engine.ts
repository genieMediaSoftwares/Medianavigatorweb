import type {
  NormalizedMedia, PlatformConnection, KeySignal, Observation, AIInsight, Recommendation,
  TrendItem, TimingSlot, PerformerAnalysis,
} from '../../../shared/types.js';

export interface EngineOptions {
  /** IANA timezone used to bucket publish times (profile timezone). Defaults to UTC and is reported back. */
  timezone?: string;
}

/**
 * Pure, per-user analytics over already-synced content. No I/O, no globals.
 * Naming convention: anything called "avg"/"mean" is an arithmetic mean; "median" is a median.
 * Legacy fields keep their original "avg" names for client compatibility.
 */
export class AnalyticsEngine {
  readonly timezone: string;

  constructor(private media: NormalizedMedia[], private connections: PlatformConnection[], opts: EngineOptions = {}) {
    this.timezone = opts.timezone || 'UTC';
  }

  /** Confidence reflects sample size only: it is not a statistical significance claim. */
  private confidence(): 'High' | 'Medium' {
    return this.getMedia().length >= 20 ? 'High' : 'Medium';
  }

  getMedia(platform?: string): NormalizedMedia[] {
    const connectedPlatforms = new Set(
      this.connections
        .filter((c) => c.connected)
        .map((c) => c.platform)
    );
    let activeMedia = this.media.filter((m) => connectedPlatforms.has(m.platform as any));
    if (platform && platform !== 'all') {
      return activeMedia.filter((m) => m.platform === platform);
    }
    return activeMedia;
  }

  getMediaById(id: string): NormalizedMedia | undefined {
    return this.media.find((m) => m.id === id);
  }

  // -------------------------------------------------------------
  // Real Metrics & Intelligence Engine Calculations
  // -------------------------------------------------------------

  getOverviewData() {
    const activeMedia = this.getMedia();
    const hasData = activeMedia.length > 0;
    const connectedConns = this.connections.filter((c) => c.connected);
    const connectedCount = connectedConns.length;

    if (!hasData) {
      const channelNames = connectedConns.map((c) => `${c.name} (${c.accountHandle})`).join(', ');
      return {
        hasData: false,
        message: connectedCount === 0
          ? 'Connect your account to unlock Media Intelligence.'
          : `Connected to ${channelNames || 'Channel'}. Awaiting posts to publish.`,
        hero: {
          hasData: false,
          heading: connectedCount === 0 
            ? 'Connect your media to begin.' 
            : `Connected to ${channelNames || 'Channel'} — No published posts found yet.`,
          summary: connectedCount === 0
            ? 'Connect Instagram, Facebook, YouTube, or LinkedIn to start analyzing real media performance.'
            : 'Your channel is securely connected. As soon as posts or videos are published, they will appear here.',
          badge: connectedCount === 0 ? 'No platforms connected' : 'Connected (0 posts)',
          confidence: 'N/A',
        },
        signals: [],
        observations: [],
        connections: this.connections,
      };
    }

    // Calculate real stats strictly from activeMedia of currently connected platforms
    const totalViews = activeMedia.reduce((acc, m) => acc + (m.views || 0), 0);
    const totalInteractions = activeMedia.reduce((acc, m) => acc + (m.likes || 0) + (m.comments || 0), 0);
    const avgEngagement = activeMedia.length > 0
      ? (activeMedia.reduce((acc, m) => acc + m.engagementRate, 0) / activeMedia.length).toFixed(2)
      : '0';

    // Find best performing format
    const formatStats: Record<string, { count: number; totalEng: number }> = {};
    for (const m of activeMedia) {
      if (!formatStats[m.contentType]) formatStats[m.contentType] = { count: 0, totalEng: 0 };
      formatStats[m.contentType].count++;
      formatStats[m.contentType].totalEng += m.engagementRate;
    }

    let bestFormat = 'Media';
    let highestAvgEng = 0;
    for (const [fmt, stat] of Object.entries(formatStats)) {
      const avg = stat.totalEng / stat.count;
      if (avg > highestAvgEng) {
        highestAvgEng = avg;
        bestFormat = fmt;
      }
    }

    return {
      hasData: true,
      hero: {
        hasData: true,
        heading: `Analyzed ${activeMedia.length} real assets across ${connectedCount} connected channel${connectedCount === 1 ? '' : 's'}.`,
        summary: `Top observed format is ${bestFormat} averaging ${highestAvgEng.toFixed(2)}% engagement. Total verified interactions logged: ${totalInteractions.toLocaleString()}.`,
        badge: 'Derived from real verified platform data',
        confidence: 'High',
      },
      signals: this.getKeySignals(),
      observations: this.getObservations(),
      connections: this.connections,
    };
  }

  getKeySignals(): KeySignal[] {
    const activeMedia = this.getMedia();
    if (activeMedia.length === 0) {
      return [];
    }

    const signals: KeySignal[] = [];

    // Signal 1: What's working based on real items
    const sorted = [...activeMedia].sort((a, b) => b.engagementRate - a.engagementRate);
    const topItem = sorted[0];

    if (topItem) {
      signals.push({
        id: 'sig_working',
        category: "What's working",
        icon: '🎯',
        title: `${topItem.platform.toUpperCase()} ${topItem.contentType.toUpperCase()}`,
        description: `Top asset "${topItem.title}" achieved ${topItem.engagementRate}% engagement with ${topItem.likes} likes and ${topItem.comments} comments.`,
        actionText: 'Inspect content',
        actionTarget: 'content',
      });
    }

    // Signal 2: Best timing (only if >= 5 posts)
    if (activeMedia.length >= 5) {
      const bestWindow = this.computeStrongestTimingWindow();
      if (bestWindow) {
        signals.push({
          id: 'sig_timing',
          category: 'Best time',
          icon: '🕖',
          title: `${bestWindow.day} — ${bestWindow.timeSlot}`,
          description: `Observed ${bestWindow.avgEngagement.toFixed(2)}% mean engagement across ${bestWindow.sampleCount} post(s) in this historical window (${bestWindow.timezone}).`,
          actionText: 'See timing matrix',
          actionTarget: 'timing',
        });
      }
    } else {
      signals.push({
        id: 'sig_timing',
        category: 'Best time',
        icon: '⏳',
        title: 'Gathering historical timestamps',
        description: `Currently analyzed ${activeMedia.length} posts. At least 5 posts needed to calculate reliable timing patterns.`,
        actionText: 'View timing status',
        actionTarget: 'timing',
      });
    }

    // Signal 3: Opportunity
    const underperforming = sorted.filter((m) => m.engagementRate < 1.0);
    if (underperforming.length > 0) {
      signals.push({
        id: 'sig_opp',
        category: 'New opportunity',
        icon: '💡',
        title: 'Format optimization',
        description: `${underperforming.length} posts had low engagement (<1.0%). Review pacing and first-3-second hooks.`,
        actionText: 'Review recommendations',
        actionTarget: 'recommendations',
      });
    }

    return signals;
  }

  getObservations(): Observation[] {
    const activeMedia = this.getMedia();
    if (activeMedia.length === 0) {
      return [];
    }

    const observations: Observation[] = [];

    // Group by platform
    const platformMediaMap: Record<string, NormalizedMedia[]> = {};
    for (const m of activeMedia) {
      if (!platformMediaMap[m.platform]) platformMediaMap[m.platform] = [];
      platformMediaMap[m.platform].push(m);
    }

    for (const [platform, items] of Object.entries(platformMediaMap)) {
      const avgEng = (items.reduce((a, b) => a + b.engagementRate, 0) / items.length).toFixed(2);
      const totalViews = items.reduce((a, b) => a + b.views, 0);

      observations.push({
        id: `obs_${platform}`,
        icon: platform === 'youtube' ? '🎥' : (platform === 'instagram' ? '📸' : '💬'),
        title: `${platform.toUpperCase()} Performance Baseline`,
        explanation: `Based on ${items.length} retrieved ${platform} posts, your audience average engagement rate is ${avgEng}%.`,
        details: {
          trend: `${items.length} verified assets analyzed`,
          impact: totalViews > 0 ? `${totalViews.toLocaleString()} total logged views` : `${items.length} posts tracked`,
          observedSignal: `Average engagement rate: ${avgEng}%`,
        },
      });
    }

    return observations;
  }

  // -------------------------------------------------------------
  // Timing Intelligence
  // -------------------------------------------------------------

  getTimingData() {
    const activeMedia = this.getMedia();
    if (activeMedia.length < 3) {
      return {
        hasData: false,
        title: 'When should you publish?',
        subtitle: 'Based on your own historical performance.',
        message: 'Not enough historical data is available to generate a reliable posting-time recommendation. Continue publishing and syncing data to improve this analysis.',
        strongestWindow: null,
        matrix: [],
      };
    }

    const matrix = this.computeTimingMatrix();
    const strongestWindow = this.computeStrongestTimingWindow();

    return {
      hasData: true,
      title: 'When should you publish?',
      subtitle: 'Derived strictly from real publication timestamps and verified audience responses.',
      strongestWindow: strongestWindow ? {
        label: `${strongestWindow.day} — ${strongestWindow.timeOfDay}`,
        timeSlot: strongestWindow.timeSlot,
        confidence: strongestWindow.sampleCount >= 5 ? 'High' : 'Low',
        supportingText: `Based on ${strongestWindow.sampleCount} post${strongestWindow.sampleCount === 1 ? '' : 's'} in this window averaging ${strongestWindow.avgEngagement.toFixed(2)}% engagement (mean). Times are in ${strongestWindow.timezone}.`,
      } : null,
      matrix,
    };
  }

  private static readonly DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;
  private static readonly TIMES = ['Morning', 'Afternoon', 'Evening', 'Night'] as const;
  private static readonly SLOT_LABEL: Record<string, string> = {
    Morning: '6:00 AM – 12:00 PM',
    Afternoon: '12:00 PM – 5:00 PM',
    Evening: '5:00 PM – 10:00 PM',
    Night: '10:00 PM – 6:00 AM',
  };
  private static readonly FULL_DAY: Record<string, string> = {
    Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday',
  };

  /** Weekday/hour of a timestamp in the engine's timezone (not the server's). */
  private localParts(iso: string): { day: (typeof AnalyticsEngine.DAYS)[number]; hour: number } | null {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: this.timezone, weekday: 'short', hour: 'numeric', hourCycle: 'h23' }).formatToParts(d);
    const day = parts.find((p) => p.type === 'weekday')?.value as (typeof AnalyticsEngine.DAYS)[number] | undefined;
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    if (!day || !AnalyticsEngine.DAYS.includes(day) || !Number.isFinite(hour)) return null;
    return { day, hour };
  }

  private timingBuckets() {
    const buckets = new Map<string, { day: string; timeOfDay: string; count: number; totalEng: number }>();
    for (const d of AnalyticsEngine.DAYS) for (const t of AnalyticsEngine.TIMES) buckets.set(`${d}_${t}`, { day: d, timeOfDay: t, count: 0, totalEng: 0 });
    for (const m of this.getMedia()) {
      const p = this.localParts(m.publishedAt);
      if (!p) continue;
      const timeOfDay = p.hour >= 6 && p.hour < 12 ? 'Morning' : p.hour >= 12 && p.hour < 17 ? 'Afternoon' : p.hour >= 17 && p.hour < 22 ? 'Evening' : 'Night';
      const b = buckets.get(`${p.day}_${timeOfDay}`)!;
      b.count++;
      b.totalEng += m.engagementRate;
    }
    return Array.from(buckets.values()).map((b) => ({ ...b, avg: b.count > 0 ? b.totalEng / b.count : 0 }));
  }

  /** Top publishing windows by mean engagement, preferring slots with at least two posts. */
  getTopWindows(n: number) {
    const populated = this.timingBuckets().filter((b) => b.count > 0);
    const robust = populated.filter((b) => b.count >= 2);
    const pool = robust.length > 0 ? robust : populated;
    return [...pool].sort((a, b) => b.avg - a.avg || b.count - a.count).slice(0, n).map((b) => ({
      day: AnalyticsEngine.FULL_DAY[b.day], timeOfDay: b.timeOfDay, timeSlot: AnalyticsEngine.SLOT_LABEL[b.timeOfDay],
      meanEngagementRate: Number(b.avg.toFixed(2)), sampleCount: b.count, timezone: this.timezone,
    }));
  }

  private computeTimingMatrix(): TimingSlot[] {
    const buckets = this.timingBuckets();
    const maxAvg = Math.max(0.01, ...buckets.filter((b) => b.count > 0).map((b) => b.avg));
    return buckets.map((b) => ({
      day: b.day as TimingSlot['day'],
      timeOfDay: b.timeOfDay as TimingSlot['timeOfDay'],
      score: b.count > 0 ? Math.min(100, Math.round((b.avg / maxAvg) * 100)) : 0,
      sampleCount: b.count,
    }));
  }

  /**
   * Best publishing window by mean engagement rate. Slots with a single post are only used when no slot has two or more,
   * because one post is an anecdote, not a pattern. `avgEngagement` is the real mean engagement rate (%) of that slot.
   */
  private computeStrongestTimingWindow(): { day: string; dayFull: string; timeOfDay: string; timeSlot: string; avgEngagement: number; sampleCount: number; timezone: string } | null {
    const populated = this.timingBuckets().filter((b) => b.count > 0);
    if (populated.length === 0) return null;
    const robust = populated.filter((b) => b.count >= 2);
    const pool = robust.length > 0 ? robust : populated;
    const top = [...pool].sort((a, b) => b.avg - a.avg || b.count - a.count)[0];
    return {
      day: top.day,
      dayFull: AnalyticsEngine.FULL_DAY[top.day],
      timeOfDay: top.timeOfDay,
      timeSlot: AnalyticsEngine.SLOT_LABEL[top.timeOfDay],
      avgEngagement: Number(top.avg.toFixed(2)),
      sampleCount: top.count,
      timezone: this.timezone,
    };
  }

  // -------------------------------------------------------------
  // Section 4 & 5: Top and Bottom Performer Analysis
  // -------------------------------------------------------------

  getTopPerformers(sortBy: 'views' | 'engagement' | 'likes' | 'comments' = 'views'): PerformerAnalysis[] {
    const activeMedia = this.getMedia();
    if (activeMedia.length === 0) return [];

    const totalViews = activeMedia.reduce((a, b) => a + (b.views || 0), 0);
    const avgViews = Math.round(totalViews / activeMedia.length);
    const avgEngagement = activeMedia.reduce((a, b) => a + b.engagementRate, 0) / activeMedia.length;

    const sorted = [...activeMedia];
    if (sortBy === 'views') {
      sorted.sort((a, b) => (b.views - a.views) || ((b.likes + b.comments) - (a.likes + a.comments)) || (b.engagementRate - a.engagementRate));
    } else if (sortBy === 'likes') {
      sorted.sort((a, b) => (b.likes - a.likes) || (b.views - a.views));
    } else if (sortBy === 'comments') {
      sorted.sort((a, b) => (b.comments - a.comments) || (b.views - a.views));
    } else {
      sorted.sort((a, b) => (b.engagementRate - a.engagementRate) || (b.views - a.views));
    }

    const topCount = Math.max(1, Math.min(50, Math.ceil(activeMedia.length * 0.4)));
    const topItems = sorted.slice(0, topCount);

    return topItems.map((item) => {
      let baselineComparison = '';
      if (sortBy === 'views' && avgViews > 0) {
        const diff = ((item.views - avgViews) / avgViews) * 100;
        baselineComparison = `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs avg views (${avgViews.toLocaleString()})`;
      } else {
        const diff = avgEngagement > 0 ? ((item.engagementRate - avgEngagement) / avgEngagement) * 100 : 0;
        baselineComparison = `${diff >= 0 ? '+' : ''}${diff.toFixed(0)}% vs avg engagement (${avgEngagement.toFixed(1)}%)`;
      }

      const possibleFactors = [
        item.contentType === 'reel' || item.contentType === 'video'
          ? `Video format with ${item.views.toLocaleString()} verified plays (retention and traffic sources are not available from the platform data used here)`
          : `${item.views > 0 ? `${item.views.toLocaleString()} verified views` : `${item.likes} verified likes`} (why viewers engaged is not measurable from this data)`,
        (item.comments || 0) > 5
          ? `${item.comments} verified comments, more than most posts attract`
          : `${item.likes} verified likes and ${item.comments} verified comments`,
        item.reach > 0
          ? `Reached ${item.reach.toLocaleString()} accounts (as reported by the platform)`
          : `Reach was not reported by the platform for this post`,
      ];

      return {
        id: `top_${item.id}`,
        mediaId: item.id,
        title: item.title,
        caption: item.caption,
        platform: item.platform,
        contentType: item.contentType,
        views: item.views,
        reach: item.reach,
        likes: item.likes,
        comments: item.comments,
        shares: item.shares,
        engagementRate: item.engagementRate,
        baselineComparison,
        isTopPerformer: true,
        possibleFactors,
        patternToReplicateOrImprove: `Replicate the opening visual hook and topic structure of "${item.title.slice(0, 40)}" in your upcoming releases.`,
        uncertaintyNote: 'Views, reach, likes, and comments are verified directly from platform APIs. Contributing factors are data-inferred patterns from baseline variance.',
        publishedAt: item.publishedAt,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
      };
    });
  }

  getBottomPerformers(sortBy: 'views' | 'engagement' | 'likes' | 'comments' = 'views'): PerformerAnalysis[] {
    const activeMedia = this.getMedia();
    if (activeMedia.length < 2) return [];

    const totalViews = activeMedia.reduce((a, b) => a + (b.views || 0), 0);
    const avgViews = Math.round(totalViews / activeMedia.length);
    const avgEngagement = activeMedia.reduce((a, b) => a + b.engagementRate, 0) / activeMedia.length;

    const sorted = [...activeMedia];
    if (sortBy === 'views') {
      sorted.sort((a, b) => (a.views - b.views) || ((a.likes + a.comments) - (b.likes + b.comments)) || (a.engagementRate - b.engagementRate));
    } else if (sortBy === 'likes') {
      sorted.sort((a, b) => (a.likes - b.likes) || (a.views - b.views));
    } else if (sortBy === 'comments') {
      sorted.sort((a, b) => (a.comments - b.comments) || (a.views - b.views));
    } else {
      sorted.sort((a, b) => (a.engagementRate - b.engagementRate) || (a.views - b.views));
    }

    const bottomCount = Math.max(1, Math.min(50, Math.floor(activeMedia.length * 0.4)));
    const bottomItems = sorted.slice(0, bottomCount);

    return bottomItems.map((item) => {
      let baselineComparison = '';
      if (sortBy === 'views' && avgViews > 0) {
        const diff = ((item.views - avgViews) / avgViews) * 100;
        baselineComparison = `${diff.toFixed(0)}% below avg views (${avgViews.toLocaleString()})`;
      } else {
        const diff = avgEngagement > 0 ? ((item.engagementRate - avgEngagement) / avgEngagement) * 100 : 0;
        baselineComparison = `${diff.toFixed(0)}% below avg engagement (${avgEngagement.toFixed(1)}%)`;
      }

      const possibleFactors = [
        'Possible: the cover or opening seconds did not stand out in the feed (not measurable from the data available)',
        'Possible: the caption or call-to-action did not prompt comments or shares',
        'Possible: the publishing time was less favourable than your strongest window',
      ];

      return {
        id: `bot_${item.id}`,
        mediaId: item.id,
        title: item.title,
        caption: item.caption,
        platform: item.platform,
        contentType: item.contentType,
        views: item.views,
        reach: item.reach,
        likes: item.likes,
        comments: item.comments,
        shares: item.shares,
        engagementRate: item.engagementRate,
        baselineComparison,
        isTopPerformer: false,
        possibleFactors,
        patternToReplicateOrImprove: 'Refine the opening line and lead with the most surprising fact or punchline before testing this topic again.',
        alternativeApproach: `Repackage this topic into a fast-paced 30-second Reel or high-contrast carousel with bold headline overlays.`,
        uncertaintyNote: 'Weaker performance can reflect normal variation rather than lack of interest in the topic. Test again before drawing conclusions.',
        publishedAt: item.publishedAt,
        thumbnailUrl: item.thumbnailUrl,
        mediaUrl: item.mediaUrl,
      };
    });
  }

  // -------------------------------------------------------------
  // Comprehensive Archive Analysis (All Reels & All Posts)
  // -------------------------------------------------------------

  getComprehensiveArchiveAnalysis() {
    const activeMedia = this.getMedia();
    if (activeMedia.length === 0) {
      return {
        hasData: false,
        totalAnalyzed: 0,
        totalReels: 0,
        totalPostsAndCarousels: 0,
        totalVerifiedViews: 0,
        totalInteractions: 0,
        avgEngagementRate: 0,
        formats: [],
        topWinningFormat: 'None',
        captionAnalysis: {
          questionHook: { countWithQuestion: 0, avgEngagementWithQuestion: 0, countWithoutQuestion: 0, avgEngagementWithoutQuestion: 0, delta: 0 },
          captionLength: { shortCount: 0, shortAvgEngagement: 0, longCount: 0, longAvgEngagement: 0 },
        },
        topPerformer: null,
        lowestPerformer: null,
        message: 'No published media items have been synced yet. Connect your account to analyze all posts and reels.',
      };
    }

    const totalCount = activeMedia.length;
    const totalViews = activeMedia.reduce((acc, m) => acc + (m.views || 0), 0);
    const totalLikes = activeMedia.reduce((acc, m) => acc + (m.likes || 0), 0);
    const totalComments = activeMedia.reduce((acc, m) => acc + (m.comments || 0), 0);
    const totalInteractions = totalLikes + totalComments;
    const avgEngagement = Number((activeMedia.reduce((acc, m) => acc + m.engagementRate, 0) / totalCount).toFixed(2));

    // Formats Breakdown
    const formatStats: Record<string, { count: number; views: number; likes: number; comments: number; totalEng: number }> = {};
    for (const m of activeMedia) {
      const type = m.contentType || 'post';
      if (!formatStats[type]) {
        formatStats[type] = { count: 0, views: 0, likes: 0, comments: 0, totalEng: 0 };
      }
      formatStats[type].count += 1;
      formatStats[type].views += m.views || 0;
      formatStats[type].likes += m.likes || 0;
      formatStats[type].comments += m.comments || 0;
      formatStats[type].totalEng += m.engagementRate;
    }

    const formats = Object.entries(formatStats).map(([format, s]) => ({
      format,
      count: s.count,
      percentageOfLibrary: Math.round((s.count / totalCount) * 100),
      totalViews: s.views,
      avgViews: Math.round(s.views / s.count),
      avgLikes: Math.round(s.likes / s.count),
      avgComments: Math.round(s.comments / s.count),
      avgEngagement: Number((s.totalEng / s.count).toFixed(2)),
    })).sort((a, b) => b.avgEngagement - a.avgEngagement);

    // Question hook analysis
    const withQuestion = this.media.filter(m => m.caption && m.caption.includes('?'));
    const withoutQuestion = this.media.filter(m => !m.caption || !m.caption.includes('?'));
    const questionAvgEng = withQuestion.length > 0 
      ? Number((withQuestion.reduce((acc, m) => acc + m.engagementRate, 0) / withQuestion.length).toFixed(2)) 
      : 0;
    const withoutQuestionAvgEng = withoutQuestion.length > 0 
      ? Number((withoutQuestion.reduce((acc, m) => acc + m.engagementRate, 0) / withoutQuestion.length).toFixed(2)) 
      : 0;

    // Caption length analysis
    const shortCaptions = this.media.filter(m => (m.caption || '').length < 120);
    const longCaptions = this.media.filter(m => (m.caption || '').length >= 120);
    const shortAvgEng = shortCaptions.length > 0
      ? Number((shortCaptions.reduce((acc, m) => acc + m.engagementRate, 0) / shortCaptions.length).toFixed(2))
      : 0;
    const longAvgEng = longCaptions.length > 0
      ? Number((longCaptions.reduce((acc, m) => acc + m.engagementRate, 0) / longCaptions.length).toFixed(2))
      : 0;

    const sorted = [...this.media].sort((a, b) => b.engagementRate - a.engagementRate);
    const topPerformer = sorted[0];
    const lowestPerformer = sorted[sorted.length - 1];

    const isYouTubeOnly = this.media.length > 0 && this.media.every(m => m.platform === 'youtube');
    const shortsOnly = this.media.filter(m => m.contentType === 'short');
    const videosOnly = this.media.filter(m => m.contentType === 'video');
    const reelsOnly = this.media.filter(m => m.contentType === 'reel' || m.contentType === 'video' || m.contentType === 'short');
    const postsOnly = this.media.filter(m => m.contentType === 'post' || m.contentType === 'carousel');

    return {
      hasData: true,
      totalAnalyzed: totalCount,
      isYouTubeOnly,
      totalShorts: shortsOnly.length,
      totalVideos: videosOnly.length,
      totalReels: reelsOnly.length,
      totalPostsAndCarousels: isYouTubeOnly ? videosOnly.length : postsOnly.length,
      totalVerifiedViews: totalViews,
      totalInteractions,
      avgEngagementRate: avgEngagement,
      formats,
      topWinningFormat: formats[0]?.format || (isYouTubeOnly ? 'short' : 'reel'),
      captionAnalysis: {
        questionHook: {
          countWithQuestion: withQuestion.length,
          avgEngagementWithQuestion: questionAvgEng,
          countWithoutQuestion: withoutQuestion.length,
          avgEngagementWithoutQuestion: withoutQuestionAvgEng,
          delta: Number((questionAvgEng - withoutQuestionAvgEng).toFixed(2)),
        },
        captionLength: {
          shortCount: shortCaptions.length,
          shortAvgEngagement: shortAvgEng,
          longCount: longCaptions.length,
          longAvgEngagement: longAvgEng,
        },
      },
      topPerformer: topPerformer ? {
        id: topPerformer.id,
        title: topPerformer.title,
        contentType: topPerformer.contentType,
        engagementRate: topPerformer.engagementRate,
        views: topPerformer.views,
        likes: topPerformer.likes,
        comments: topPerformer.comments,
      } : null,
      lowestPerformer: lowestPerformer ? {
        id: lowestPerformer.id,
        title: lowestPerformer.title,
        contentType: lowestPerformer.contentType,
        engagementRate: lowestPerformer.engagementRate,
        views: lowestPerformer.views,
        likes: lowestPerformer.likes,
        comments: lowestPerformer.comments,
      } : null,
    };
  }

  // -------------------------------------------------------------
  // Section 9: Content Pattern Analysis
  // -------------------------------------------------------------

  getContentPatterns(): any[] {
    if (this.media.length === 0) return [];

    const formatMap = new Map<string, { count: number; totalEng: number; totalViews: number }>();
    for (const m of this.media) {
      const entry = formatMap.get(m.contentType) || { count: 0, totalEng: 0, totalViews: 0 };
      entry.count += 1;
      entry.totalEng += m.engagementRate;
      entry.totalViews += m.views;
      formatMap.set(m.contentType, entry);
    }

    const formatPatterns = Array.from(formatMap.entries()).map(([format, data]) => ({
      format,
      count: data.count,
      avgEngagement: Number((data.totalEng / data.count).toFixed(2)),
      avgViews: Math.round(data.totalViews / data.count),
    }));

    return formatPatterns.sort((a, b) => b.avgEngagement - a.avgEngagement);
  }

  // -------------------------------------------------------------
  // AI Insights Stream (Section 13 Specification)
  // -------------------------------------------------------------

  getInsights(): AIInsight[] {
    if (this.media.length === 0) {
      return [];
    }

    const insights: AIInsight[] = [];
    const sorted = [...this.media].sort((a, b) => b.engagementRate - a.engagementRate);

    // Insight 1: Pattern detected (Top Performer)
    const top = sorted[0];
    if (top) {
      const medianEng = sorted[Math.floor(sorted.length / 2)]?.engagementRate || 1;
      const multiple = (top.engagementRate / Math.max(0.1, medianEng)).toFixed(1);
      const isYt = top.platform === 'youtube';
      insights.push({
        id: 'ins_1',
        category: 'Pattern detected',
        icon: isYt ? '🏆' : '✨',
        title: `High Engagement on ${top.platform.toUpperCase()}: "${top.title.slice(0, 45)}..."`,
        description: `Observed: "${top.title}" reached ${top.engagementRate}% engagement rate with ${top.views?.toLocaleString()} views, ${top.likes?.toLocaleString()} likes, and ${top.comments?.toLocaleString()} comments.`,
        whyItMatters: `This single asset outperformed your channel median engagement rate by ${multiple}x. Retention is not measured here, so the reason for the difference is unknown.`,
        confidence: this.confidence(),
        detectedAt: 'Computed from last sync',
        recommendedAction: `Produce a follow-up or sequel to "${top.title.slice(0, 30)}..." replicating its opening hook and topic structure.`,
        observation: `Highest recorded engagement rate (${top.engagementRate}%) on ${top.platform}.`,
        supportingData: `${top.views ? top.views.toLocaleString() + ' views, ' : ''}${top.likes} likes, ${top.comments} comments (${multiple}x channel median).`,
        possibleReason: 'Immediate visual payoff and resonant subject matter captured audience interest.',
        measurement: 'Engagement rate of the follow-up compared with this post.',
      });
    }

    // Insight 2: YouTube Shorts vs Long-Form or Audience Velocity
    const ytShorts = this.media.filter(m => m.platform === 'youtube' && m.contentType === 'short');
    const ytVideos = this.media.filter(m => m.platform === 'youtube' && m.contentType === 'video');

    if (ytShorts.length > 0 && ytVideos.length > 0) {
      const shortsAvgViews = Math.round(ytShorts.reduce((a, b) => a + b.views, 0) / ytShorts.length);
      const videosAvgViews = Math.round(ytVideos.reduce((a, b) => a + b.views, 0) / ytVideos.length);
      const shortsRatio = videosAvgViews > 0 ? (shortsAvgViews / videosAvgViews).toFixed(1) : '1.0';

      insights.push({
        id: 'ins_yt_format_variance',
        category: 'Pattern detected',
        icon: '⚡',
        title: `YouTube Format Dynamics: Shorts vs Long-Form`,
        description: `Shorts average ${shortsAvgViews.toLocaleString()} views vs ${videosAvgViews.toLocaleString()} views on long-form videos (${shortsRatio}x view velocity difference).`,
        whyItMatters: 'Shorts and long-form videos are distributed differently on YouTube; compare how each performs for you before shifting effort.',
        confidence: this.confidence(),
        detectedAt: 'Computed from last sync',
        recommendedAction: 'Test pointing Shorts viewers to your longer videos and compare the results.',
        observation: `Evaluated ${ytShorts.length} Shorts and ${ytVideos.length} long-form uploads.`,
        supportingData: `Shorts avg views: ${shortsAvgViews.toLocaleString()} · Videos avg views: ${videosAvgViews.toLocaleString()}.`,
        possibleReason: 'Shorts shelf provides rapid non-subscriber distribution.',
        measurement: 'Subscriber conversion per 1,000 views between formats.',
      });
    } else {
      // General velocity insight
      const totalViews = this.media.reduce((acc, m) => acc + (m.views || 0), 0);
      const totalLikes = this.media.reduce((acc, m) => acc + (m.likes || 0), 0);
      const totalComments = this.media.reduce((acc, m) => acc + (m.comments || 0), 0);
      const likeRatio = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : '0';

      if (totalViews > 0) {
        insights.push({
          id: 'ins_velocity',
          category: 'Growth signal',
          icon: '📈',
          title: 'Audience Conversion Velocity',
          description: `Your synchronized assets have generated ${totalViews.toLocaleString()} verified views with an interaction ratio of ${likeRatio}%.`,
          whyItMatters: `${totalComments.toLocaleString()} viewers took the effort to comment, signaling high audience affinity and active community discussion.`,
          confidence: this.confidence(),
          detectedAt: 'Computed from last sync',
          recommendedAction: 'Pin thought-provoking questions in the top comment within 60 minutes of publishing to boost comment ranking.',
          observation: `Interaction density stands at ${likeRatio}% across ${totalViews.toLocaleString()} verified views.`,
          supportingData: `${totalLikes.toLocaleString()} total likes and ${totalComments.toLocaleString()} total comments recorded.`,
          possibleReason: 'High audience affinity and active community involvement.',
          measurement: 'Comment-to-view ratio and reply rate.',
        });
      }
    }

    // Insight 3: Optimal Cadence & Timing
    const timingWindow = this.computeStrongestTimingWindow();
    if (timingWindow) {
      insights.push({
        id: 'ins_timing',
        category: 'Timing signal',
        icon: '⏱️',
        title: `Optimal Momentum: ${timingWindow.day} ${timingWindow.timeOfDay}`,
        description: `Historical posts published during ${timingWindow.day} ${timingWindow.timeOfDay.toLowerCase()}s achieve your highest recorded engagement rate (${timingWindow.avgEngagement.toFixed(2)}%).`,
        whyItMatters: 'Publishing when your audience is likely to be active may help early engagement. Audience activity itself is not measured here; this is inferred from your own posts.',
        confidence: this.confidence(),
        detectedAt: 'Computed from last sync',
        recommendedAction: `Schedule your next release for ${timingWindow.day} around ${timingWindow.timeSlot}.`,
        observation: `Engagement peaks during ${timingWindow.day} ${timingWindow.timeOfDay.toLowerCase()} releases.`,
        supportingData: `Recorded average of ${timingWindow.avgEngagement.toFixed(2)}% engagement in this window.`,
        possibleReason: 'Inferred from publish times and engagement only; audience activity data is not available.',
        measurement: 'Initial 2-hour impression velocity vs daytime posts.',
      });
    }

    // Insight 4: Format Variance & Opportunity
    const bottom = sorted[sorted.length - 1];
    if (bottom && bottom !== top) {
      insights.push({
        id: 'ins_format',
        category: 'Opportunity',
        icon: '🔍',
        title: `Format Optimization: ${bottom.contentType.toUpperCase()}`,
        description: `Observed: "${bottom.title}" generated ${bottom.engagementRate}% engagement rate. Possible explanation: thumbnail or opening 5 seconds did not immediately hook viewers.`,
        whyItMatters: 'Systematically diagnosing underperforming content preserves creator morale and production budget.',
        confidence: 'Medium',
        detectedAt: 'Computed from last sync',
        recommendedAction: 'Test updating the title with higher curiosity or urgency before concluding the topic lacks demand.',
        observation: `Underperformance observed on "${bottom.title.slice(0, 35)}..." (${bottom.engagementRate}% engagement).`,
        supportingData: `Yielded ${bottom.likes} likes and ${bottom.comments} comments, below account average.`,
        possibleReason: 'Thumbnail or opening 5 seconds may not have communicated value proposition quickly enough.',
        measurement: 'Click-through rate and 3-second watch percentage after hook update.',
      });
    }

    return insights;
  }

  // -------------------------------------------------------------
  // Section 6: AI-Powered Content Improvement Recommendations
  // -------------------------------------------------------------

  getRecommendations(): Recommendation[] {
    if (this.media.length === 0) {
      return [];
    }

    const recs: Recommendation[] = [];
    const slot = this.computeStrongestTimingWindow();
    const topItems = [...this.media].sort((a, b) => b.engagementRate - a.engagementRate).slice(0, 3);

    topItems.forEach((item, index) => {
      const isTop = index === 0;
      recs.push({
        id: `rec_${item.id}`,
        type: isTop ? 'CREATE' : (index === 1 ? 'REPURPOSE' : 'TEST'),
        title: isTop
          ? `Create high-impact sequel to "${item.title.slice(0, 45)}"`
          : (index === 1 ? `Repurpose "${item.title.slice(0, 45)}" across channels` : `Test curiosity-driven hook on "${item.title.slice(0, 45)}"`),
        reason: `Generated ${item.engagementRate}% engagement with ${item.likes} verified interactions.`,
        supportingSignal: `Observed ${item.views ? item.views.toLocaleString() + ' views and ' : ''}${item.likes} likes on ${item.platform}.`,
        actionText: 'Plan in schedule',
        status: 'pending',
        suggestedSlot: slot ? { day: slot.dayFull, time: slot.timeSlot.split(' – ')[0], format: item.contentType } : undefined,
        // Section 6 Fields
        identifiedProblem: isTop
          ? 'Audience interest peaked on this topic but no direct follow-up content was scheduled.'
          : 'High-performing concept is siloed to one format and not reaching secondary audience segments.',
        supportingPattern: `Historical engagement rate of ${item.engagementRate}% exceeds channel baseline.`,
        recommendedImprovement: isTop
          ? `Draft a part-2 deep dive exploring the most requested question in "${item.title.slice(0, 30)}" comments.`
          : `Convert this core thesis into a 5-slide visual carousel and short-form Reel with bold text overlays.`,
        suggestedImplementation: 'Script opening hook in first 2 seconds: "In my last post, you asked about [core problem]—here is exactly what happened."',
        expectedMeasurement: 'Track whether part-2 achieves within 85% of part-1 engagement rate compared with this post.',
      });
    });

    return recs;
  }

  getTrends(): TrendItem[] {
    if (this.media.length === 0) {
      return [];
    }

    const trends: TrendItem[] = [];
    const isYtConnected = this.connections.find((c) => c.platform === 'youtube')?.connected || this.media.some(m => m.platform === 'youtube');
    const dominantPlatform = isYtConnected ? 'youtube' : 'instagram';

    // 1. Engagement Velocity (Recent vs Earlier published assets)
    if (this.media.length >= 2) {
      const sortedByDate = [...this.media].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
      const mid = Math.floor(sortedByDate.length / 2);
      const recentHalf = sortedByDate.slice(0, mid);
      const olderHalf = sortedByDate.slice(mid);

      const recentAvg = recentHalf.reduce((a, b) => a + b.engagementRate, 0) / recentHalf.length;
      const olderAvg = olderHalf.reduce((a, b) => a + b.engagementRate, 0) / olderHalf.length;

      const change = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
      const changeSign = change >= 0 ? '+' : '';

      trends.push({
        id: 'tr_engagement_velocity',
        name: 'Recent Engagement Velocity',
        category: 'Audience behaviour',
        status: change >= 5 ? 'Rising' : (change <= -5 ? 'Losing momentum' : 'Stable'),
        explanation: `Observed: Recent ${recentHalf.length} assets averaged ${recentAvg.toFixed(2)}% engagement vs ${olderAvg.toFixed(2)}% on earlier releases.`,
        changeRate: `${changeSign}${change.toFixed(1)}%`,
        reasonForRelevance: `Measured across your ${this.media.length} verified published assets.`,
        recommendedPlatform: dominantPlatform,
        suggestedFormat: dominantPlatform === 'youtube' ? 'Short' : 'Reel',
        contentConcept: change >= 0 
          ? 'Double down on the visual hooks and pacing used in your most recent releases.'
          : 'Re-evaluate opening visual hooks and test shorter video duration.',
        suggestedHook: '"Here is what we observed after analyzing recent audience interaction velocity..."',
        targetAudienceRelevance: 'Audience responds strongly to timely, fast-paced execution.',
        captionDirection: 'Engage audience with a focused question in first two lines.',
        recommendedNextAction: 'Review top 3 recent performers and replicate their opening format.',
        trendType: 'Inferred from profile data',
      });
    }

    // 2. Format Resonancy Trend (Top format vs baseline)
    const formatStats: Record<string, { count: number; totalEng: number; totalViews: number }> = {};
    for (const m of this.media) {
      const fmt = m.contentType || 'post';
      if (!formatStats[fmt]) formatStats[fmt] = { count: 0, totalEng: 0, totalViews: 0 };
      formatStats[fmt].count++;
      formatStats[fmt].totalEng += m.engagementRate;
      formatStats[fmt].totalViews += (m.views || 0);
    }

    const overallAvgEng = this.media.reduce((a, b) => a + b.engagementRate, 0) / this.media.length;
    let bestFmt = '';
    let bestFmtAvg = 0;
    for (const [fmt, stat] of Object.entries(formatStats)) {
      const avg = stat.totalEng / stat.count;
      if (avg > bestFmtAvg) {
        bestFmtAvg = avg;
        bestFmt = fmt;
      }
    }

    if (bestFmt && overallAvgEng > 0) {
      const lift = ((bestFmtAvg - overallAvgEng) / overallAvgEng) * 100;
      const liftSign = lift >= 0 ? '+' : '';
      trends.push({
        id: 'tr_format_dominance',
        name: `${bestFmt.toUpperCase()} Format Momentum`,
        category: 'Formats',
        status: lift >= 0 ? 'Rising' : 'Stable',
        explanation: `${bestFmt.toUpperCase()} assets average ${bestFmtAvg.toFixed(2)}% engagement rate (${liftSign}${lift.toFixed(1)}% vs channel baseline).`,
        changeRate: `${liftSign}${lift.toFixed(1)}%`,
        reasonForRelevance: `Analyzed from ${formatStats[bestFmt]?.count || 0} published ${bestFmt} releases.`,
        recommendedPlatform: dominantPlatform,
        suggestedFormat: bestFmt as any,
        contentConcept: `Prioritize ${bestFmt} productions over lower-converting formats based on your measured engagement.`,
        suggestedHook: `"The single biggest takeaway from our highest-performing ${bestFmt}..."`,
        targetAudienceRelevance: `${bestFmt} posts have higher measured engagement than your overall average; watch completion and saves are not measured.`,
        captionDirection: `Include clear bullet points and action takeaways.`,
        recommendedNextAction: `Plan 2 additional ${bestFmt} assets into your upcoming publishing schedule.`,
        trendType: 'Inferred from profile data',
      });
    }

    // 3. Question Hook Delta Trend
    const withQuestion = this.media.filter(m => m.caption && m.caption.includes('?'));
    const withoutQuestion = this.media.filter(m => !m.caption || !m.caption.includes('?'));
    if (withQuestion.length > 0 && withoutQuestion.length > 0) {
      const qAvg = withQuestion.reduce((a, b) => a + b.engagementRate, 0) / withQuestion.length;
      const noQAvg = withoutQuestion.reduce((a, b) => a + b.engagementRate, 0) / withoutQuestion.length;
      if (noQAvg > 0) {
        const qLift = ((qAvg - noQAvg) / noQAvg) * 100;
        const qSign = qLift >= 0 ? '+' : '';
        trends.push({
          id: 'tr_question_hook',
          name: 'Interrogative Caption Hooks',
          category: 'Topics',
          status: qLift >= 0 ? 'Rising' : 'Stable',
          explanation: `Posts featuring an explicit question hook achieve ${qSign}${qLift.toFixed(1)}% higher engagement (${qAvg.toFixed(2)}% vs ${noQAvg.toFixed(2)}%).`,
          changeRate: `${qSign}${qLift.toFixed(1)}%`,
          reasonForRelevance: `Directly measured across ${withQuestion.length} questions vs ${withoutQuestion.length} statements in your archive.`,
          recommendedPlatform: dominantPlatform,
          suggestedFormat: dominantPlatform === 'youtube' ? 'Short' : 'Post',
          contentConcept: 'Open your video or caption with a direct viewer question rather than a statement.',
          suggestedHook: '"Have you noticed this shift in your niche lately?"',
          targetAudienceRelevance: 'Questions may prompt more comments, which count toward engagement rate.',
          captionDirection: 'Pin the best comment reply within 60 minutes of posting.',
          recommendedNextAction: 'Add a prominent question hook to your next planned release.',
          trendType: 'Inferred from profile data',
        });
      }
    }

    return trends;
  }
}
