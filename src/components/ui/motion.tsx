import { motion, type HTMLMotionProps } from 'framer-motion';
import * as React from 'react';

const EASE = [0.22, 1, 0.36, 1] as const;

/** Single element that fades + rises into place. */
export function FadeUp({
  children,
  delay = 0,
  y = 14,
  className,
  ...rest
}: HTMLMotionProps<'div'> & { delay?: number; y?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggers its direct children in. Wrap items in <Stagger.Item> or pass plain
 * nodes and they get wrapped automatically.
 */
export function Stagger({
  children,
  className,
  amount = 0.06,
  y = 16,
}: {
  children: React.ReactNode;
  className?: string;
  amount?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: amount } } }}
    >
      {React.Children.map(children, (child) => (
        <motion.div
          variants={{
            hidden: { opacity: 0, y },
            show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
          }}
        >
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}
