import { useRef } from 'react';

/**
 * Usage:
 * const [blockScroll, allowScroll] = useScrollBlock();
 */
export default (className: string) => {
    const scrollBlocked = useRef<boolean>(false);

    const blockScroll = () => {
        if (scrollBlocked.current) return;

        document.body.classList.add(className);

        scrollBlocked.current = true;
    };

    const allowScroll = () => {
        if (!scrollBlocked.current) return;

        document.body.classList.remove(className);

        scrollBlocked.current = false;
    };

  return [blockScroll, allowScroll];
};