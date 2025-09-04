'use client';

import { useRef, useCallback, ReactNode } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { useTouchGestures } from '@/hooks/use-touch-gestures';
import { useHapticFeedback } from '@/hooks/use-haptic-feedback';
import { cn } from '@/lib/utils';

interface GestureHandlerProps {
  children: ReactNode;
  className?: string;
  
  // Gesture callbacks
  onTap?: (event: any) => void;
  onDoubleTap?: (event: any) => void;
  onLongPress?: (event: any) => void;
  onSwipeLeft?: (event: any, info: PanInfo) => void;
  onSwipeRight?: (event: any, info: PanInfo) => void;
  onSwipeUp?: (event: any, info: PanInfo) => void;
  onSwipeDown?: (event: any, info: PanInfo) => void;
  onPinch?: (scale: number) => void;
  
  // Configuration
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  enableHaptics?: boolean;
  disabled?: boolean;
  
  // Visual feedback
  showPressEffect?: boolean;
  pressScale?: number;
  
  // Accessibility
  accessibilityLabel?: string;
  role?: string;
}

export function GestureHandler({
  children,
  className,
  onTap,
  onDoubleTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  swipeThreshold = 50,
  longPressDelay = 500,
  doubleTapDelay = 300,
  enableHaptics = true,
  disabled = false,
  showPressEffect = true,
  pressScale = 0.98,
  accessibilityLabel,
  role = 'button'
}: GestureHandlerProps) {
  const { triggerHaptic } = useHapticFeedback();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    isPressed
  } = useTouchGestures({
    onTap: useCallback((event) => {
      if (disabled) return;
      
      if (enableHaptics) {
        triggerHaptic('selection');
      }
      
      onTap?.(event);
    }, [disabled, enableHaptics, onTap, triggerHaptic]),
    
    onDoubleTap: useCallback((event) => {
      if (disabled) return;
      
      if (enableHaptics) {
        triggerHaptic('impact', 'medium');
      }
      
      onDoubleTap?.(event);
    }, [disabled, enableHaptics, onDoubleTap, triggerHaptic]),
    
    onLongPress: useCallback((event) => {
      if (disabled) return;
      
      if (enableHaptics) {
        triggerHaptic('impact', 'heavy');
      }
      
      onLongPress?.(event);
    }, [disabled, enableHaptics, onLongPress, triggerHaptic]),
    
    longPressDelay,
    doubleTapDelay
  });

  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (disabled) return;
    
    const { offset, velocity } = info;
    const absX = Math.abs(offset.x);
    const absY = Math.abs(offset.y);
    
    // Determine swipe direction based on offset and velocity
    if (absX > swipeThreshold || absY > swipeThreshold) {
      if (enableHaptics) {
        triggerHaptic('selection');
      }
      
      if (absX > absY) {
        // Horizontal swipe
        if (offset.x > 0) {
          onSwipeRight?.(event, info);
        } else {
          onSwipeLeft?.(event, info);
        }
      } else {
        // Vertical swipe
        if (offset.y > 0) {
          onSwipeDown?.(event, info);
        } else {
          onSwipeUp?.(event, info);
        }
      }
    }
  }, [disabled, swipeThreshold, enableHaptics, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, triggerHaptic]);

  const handlePinch = useCallback((scale: number) => {
    if (disabled) return;
    
    if (enableHaptics && (scale > 1.2 || scale < 0.8)) {
      triggerHaptic('selection');
    }
    
    onPinch?.(scale);
  }, [disabled, enableHaptics, onPinch, triggerHaptic]);

  if (disabled) {
    return (
      <div className={cn('touch-none', className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={cn(
        'touch-manipulation select-none',
        'cursor-pointer',
        className
      )}
      
      // Touch events
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      
      // Mouse events (for desktop testing)
      onMouseDown={handleTouchStart}
      onMouseMove={handleTouchMove}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      
      // Pan gesture for swipes
      onPanEnd={handlePanEnd}
      
      // Pinch gesture
      onPinch={handlePinch}
      
      // Visual feedback
      animate={{
        scale: showPressEffect && isPressed ? pressScale : 1
      }}
      transition={{
        duration: 0.1,
        ease: 'easeOut'
      }}
      
      // Accessibility
      role={role}
      aria-label={accessibilityLabel}
      tabIndex={0}
      
      // Prevent text selection and context menu on long press
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent'
      }}
    >
      {children}
    </motion.div>
  );
}

interface SwipeableListItemProps extends GestureHandlerProps {
  leftAction?: {
    icon: ReactNode;
    label: string;
    color?: string;
    action: () => void;
  };
  rightAction?: {
    icon: ReactNode;
    label: string;
    color?: string;
    action: () => void;
  };
}

export function SwipeableListItem({
  children,
  leftAction,
  rightAction,
  onSwipeLeft,
  onSwipeRight,
  className,
  ...gestureProps
}: SwipeableListItemProps) {
  const handleSwipeLeft = useCallback((event: any, info: PanInfo) => {
    if (rightAction) {
      rightAction.action();
    }
    onSwipeLeft?.(event, info);
  }, [rightAction, onSwipeLeft]);

  const handleSwipeRight = useCallback((event: any, info: PanInfo) => {
    if (leftAction) {
      leftAction.action();
    }
    onSwipeRight?.(event, info);
  }, [leftAction, onSwipeRight]);

  return (
    <div className="relative overflow-hidden">
      {/* Background Actions */}
      {leftAction && (
        <div className={cn(
          'absolute left-0 top-0 bottom-0 w-20',
          'flex items-center justify-center',
          leftAction.color || 'bg-green-500',
          'text-white'
        )}>
          <div className="flex flex-col items-center">
            {leftAction.icon}
            <span className="text-xs mt-1">{leftAction.label}</span>
          </div>
        </div>
      )}
      
      {rightAction && (
        <div className={cn(
          'absolute right-0 top-0 bottom-0 w-20',
          'flex items-center justify-center',
          rightAction.color || 'bg-red-500',
          'text-white'
        )}>
          <div className="flex flex-col items-center">
            {rightAction.icon}
            <span className="text-xs mt-1">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <motion.div
        className={cn('relative z-10 bg-white', className)}
        drag="x"
        dragConstraints={{ left: -80, right: 80 }}
        dragElastic={0.1}
        onDragEnd={(event, info) => {
          if (info.offset.x > 40) {
            handleSwipeRight(event, info);
          } else if (info.offset.x < -40) {
            handleSwipeLeft(event, info);
          }
        }}
      >
        <GestureHandler
          {...gestureProps}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
          className={className}
        >
          {children}
        </GestureHandler>
      </motion.div>
    </div>
  );
}

export default GestureHandler;