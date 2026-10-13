import Ionicons from '@expo/vector-icons/Ionicons';
import { ComponentProps } from 'react';

import type { ConnectInput, Platform } from '@/types/api';

type IconName = ComponentProps<typeof Ionicons>['name'];

const META_GRAPH_EXPLORER = 'https://business.facebook.com/business/loginpage/?next=https%3A%2F%2Fdevelopers.facebook.com%2Ftools%2Fexplorer%2F#';

export interface SetupLink {
  label: string;
  url: string;
}

/** One way to authorize manually. Its value is sent as `field` to POST /connections/:platform/connect. */
export interface CredentialMode {
  id: string;
  /** Segment label when a platform offers more than one mode. */
  tab: string;
  field: 'accessToken' | 'apiKey';
  label: string;
  placeholder: string;
  hint: string;
  /** Optional second value (account / Page / channel / organization selector). */
  extra?: { key: keyof ConnectInput; label: string; placeholder: string; hint: string };
}

export interface PlatformSetup {
  /** "account", "Page", "channel" — used in headings. */
  noun: string;
  intro: string;
  setup: { icon: IconName; title: string; body: string; steps: string[]; links: SetupLink[] };
  modes: CredentialMode[];
}

/**
 * Connection guidance per platform: official setup links and the credentials the backend accepts
 * (see backend/src/validators connections.connect). URLs live only here.
 */
export const PLATFORM_SETUP: Record<Platform, PlatformSetup> = {
  instagram: {
    noun: 'account',
    intro: 'Connect your real Instagram account to bring your social data into Media Navigator for performance analysis.',
    setup: {
      icon: 'key-outline',
      title: 'Meta Graph API',
      body: 'Get a Meta access token to securely connect your account.',
      steps: [
        'Sign in and open the Graph API Explorer.',
        'Select the Meta app linked to your Instagram professional account.',
        'Add instagram_basic, instagram_manage_insights and pages_show_list, then generate the token.',
        'Copy the token and return to Media Navigator.',
      ],
      links: [{ label: 'Get token from Meta', url: META_GRAPH_EXPLORER }],
    },
    modes: [
      {
        id: 'token',
        tab: 'Access token',
        field: 'accessToken',
        label: 'Meta Graph API Token',
        placeholder: 'Paste your access token',
        hint: 'Paste your User Access Token from Meta Graph API Explorer',
        extra: { key: 'accountId', label: 'Instagram account ID (optional)', placeholder: 'e.g. 17841400000000000', hint: 'Only needed when the token covers more than one Instagram account.' },
      },
    ],
  },
  facebook: {
    noun: 'Page',
    intro: 'Connect a Facebook Page you manage to analyze its posts, videos and engagement.',
    setup: {
      icon: 'key-outline',
      title: 'Meta Developer Tools',
      body: 'Generate a token with access to the Page you want to analyze.',
      steps: [
        'Sign in and open the Graph API Explorer.',
        'Select your Meta app and the Page you manage.',
        'Add pages_show_list, pages_read_engagement and read_insights, then generate the token.',
        'Copy the token and return to Media Navigator.',
      ],
      links: [{ label: 'Open Meta Developer Tools', url: META_GRAPH_EXPLORER }],
    },
    modes: [
      {
        id: 'token',
        tab: 'Access token',
        field: 'accessToken',
        label: 'Facebook access token',
        placeholder: 'Paste your access token',
        hint: 'A User or Page access token with permission to read your Page.',
        extra: { key: 'pageId', label: 'Facebook Page ID (optional)', placeholder: 'e.g. 100000000000000', hint: 'Choose which Page to read when your token manages several.' },
      },
    ],
  },
  youtube: {
    noun: 'channel',
    intro: 'Connect with the YouTube Data API v3 for public channel and video data, and the YouTube Analytics API for watch time.',
    // YouTube's credentials (Data API key + exact channel, or Google sign-in for Analytics) are collected by
    // features/connections/YouTubeConnect.tsx; this generic setup is not shown for YouTube.
    setup: {
      icon: 'cloud-outline',
      title: 'Google Cloud',
      body: 'Enable the YouTube Data API v3 and the YouTube Analytics API in your Google Cloud project.',
      steps: [],
      links: [{ label: 'Open Google Cloud Console', url: 'https://console.cloud.google.com/apis/credentials' }],
    },
    modes: [
      { id: 'api-key', tab: 'API key', field: 'apiKey', label: 'YouTube Data API key', placeholder: 'AIza…', hint: 'Public data for the channel you name.', extra: { key: 'channelQuery', label: 'Channel ID or @handle', placeholder: '@YourChannel', hint: 'Must match exactly.' } },
    ],
  },
  linkedin: {
    noun: 'account',
    intro: 'Connect a LinkedIn Company Page you administer to analyze its posts and engagement.',
    setup: {
      icon: 'briefcase-outline',
      title: 'LinkedIn Developer Portal',
      body: 'Organization analytics need a LinkedIn app with the required products approved by LinkedIn. Creating an app alone does not grant analytics access.',
      steps: [
        'Sign in to the LinkedIn Developer Portal and open your app.',
        'Request the products your organization data needs (for example Community Management API) and wait for approval.',
        'Generate an OAuth access token with the approved scopes for an admin of the Company Page.',
        'Copy the token and return to Media Navigator.',
      ],
      links: [{ label: 'Open LinkedIn Developer Portal', url: 'https://www.linkedin.com/developers/login' }],
    },
    modes: [
      {
        id: 'token',
        tab: 'Access token',
        field: 'accessToken',
        label: 'LinkedIn access token',
        placeholder: 'Paste your access token',
        hint: 'An OAuth access token for an administrator of the Company Page.',
        extra: { key: 'organizationId', label: 'Company Page ID', placeholder: 'e.g. 12345678', hint: 'The number of the Company Page you manage.' },
      },
    ],
  },
};
