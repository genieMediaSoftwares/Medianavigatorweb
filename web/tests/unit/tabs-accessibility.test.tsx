// @vitest-environment happy-dom
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TabBar, Segmented } from '@/components/ui/tabs';
function Example() {
  const [tab, setTab] = useState('a');
  const [choice, setChoice] = useState('a');
  return <><TabBar tabs={[{ id: 'a', label: 'Posts' }, { id: 'b', label: 'Ads' }]} value={tab} onChange={setTab} label="Views" /><Segmented options={[{ value: 'a', label: 'All' }, { value: 'b', label: 'Instagram' }]} value={choice} onChange={setChoice} label="Channels" /></>;
}
describe('keyboard controls', () => {
  it('moves and wraps tabs using arrows, Home and End', () => {
    render(<Example />);
    const posts = screen.getByRole('tab', { name: 'Posts' }); const ads = screen.getByRole('tab', { name: 'Ads' });
    expect(ads).toHaveAttribute('tabindex', '-1');
    posts.focus(); fireEvent.keyDown(posts, { key: 'ArrowRight' });
    expect(ads).toHaveFocus(); expect(ads).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(ads, { key: 'ArrowRight' }); expect(posts).toHaveFocus();
    fireEvent.keyDown(posts, { key: 'End' }); expect(ads).toHaveFocus();
    fireEvent.keyDown(ads, { key: 'Home' }); expect(posts).toHaveFocus();
  });
  it('selects channel radios with the keyboard', () => {
    render(<Example />);
    const all = screen.getByRole('radio', { name: 'All' }); const instagram = screen.getByRole('radio', { name: 'Instagram' });
    fireEvent.keyDown(all, { key: 'ArrowRight' }); expect(instagram).toHaveFocus(); expect(instagram).toHaveAttribute('aria-checked', 'true');
  });
});
