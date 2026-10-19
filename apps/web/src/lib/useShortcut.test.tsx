import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { useShortcut } from './useShortcut';

function Harness({ onN }: { onN: () => void }) {
  useShortcut('n', onN);
  return <input aria-label="Field" />;
}

describe('useShortcut', () => {
  it('runs the handler for its key', async () => {
    const onN = vi.fn();
    render(<Harness onN={onN} />);
    await userEvent.keyboard('n');
    expect(onN).toHaveBeenCalledOnce();
  });

  it('ignores the key while typing in a field', async () => {
    const onN = vi.fn();
    render(<Harness onN={onN} />);
    await userEvent.type(screen.getByLabelText('Field'), 'new');
    expect(onN).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Field')).toHaveValue('new');
  });

  it('ignores it with Ctrl, so browser shortcuts still work', async () => {
    const onN = vi.fn();
    render(<Harness onN={onN} />);
    await userEvent.keyboard('{Control>}n{/Control}');
    expect(onN).not.toHaveBeenCalled();
  });

  it('ignores it while a dialog is open', async () => {
    const onN = vi.fn();
    render(
      <>
        <Harness onN={onN} />
        <dialog open>Dialog</dialog>
      </>,
    );
    await userEvent.keyboard('n');
    expect(onN).not.toHaveBeenCalled();
  });
});
