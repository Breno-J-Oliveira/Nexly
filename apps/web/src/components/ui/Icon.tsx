'use client';

import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { findIconDefinition, IconPrefix, IconName } from '@fortawesome/fontawesome-svg-core';
import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { far } from '@fortawesome/free-regular-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';

library.add(fas, far, fab);

interface IconProps {
  name: string;
  variant?: 'solid' | 'regular' | 'brand';
  size?: 'xs' | 'sm' | 'lg' | 'xl' | '2x';
  className?: string;
  color?: string;
  style?: React.CSSProperties;
}

const sizeMap: Record<string, string> = {
  xs: '0.75em',
  sm: '0.875em',
  lg: '1.33333em',
  xl: '1.5em',
  '2x': '2em',
};

const variantPrefix: Record<string, IconPrefix> = {
  solid: 'fas',
  regular: 'far',
  brand: 'fab',
};

export function Icon({ name, variant = 'solid', size = 'sm', className, color, style }: IconProps) {
  const prefix = variantPrefix[variant] || 'fas';
  const iconDef = findIconDefinition({ prefix, iconName: name as IconName });

  const mergedStyle: React.CSSProperties = { fontSize: sizeMap[size], color, ...style };

  if (!iconDef) {
    const variants: IconPrefix[] = ['fas', 'far', 'fab'];
    for (const fallbackPrefix of variants) {
      if (fallbackPrefix === prefix) continue;
      const fallbackDef = findIconDefinition({ prefix: fallbackPrefix, iconName: name as IconName });
      if (fallbackDef) {
        return <FontAwesomeIcon icon={fallbackDef} className={className} style={mergedStyle as FontAwesomeIconProps['style']} />;
      }
    }
    return <span className={className} style={mergedStyle}>•</span>;
  }

  return <FontAwesomeIcon icon={iconDef} className={className} style={mergedStyle as FontAwesomeIconProps['style']} />;
}
