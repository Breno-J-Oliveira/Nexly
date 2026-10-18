'use client';

import { FontAwesomeIcon, FontAwesomeIconProps } from '@fortawesome/react-fontawesome';
import { findIconDefinition, IconPrefix, IconName } from '@fortawesome/fontawesome-svg-core';
import { library, config } from '@fortawesome/fontawesome-svg-core';
import { faWallet,faFileImport,faClockRotateLeft,faHeartPulse,faBullhorn, faListCheck, faRepeat, faBolt, faBuilding, faFileLines, faArrowRightArrowLeft, faArrowRightFromBracket, faArrowTrendDown, faArrowTrendUp, faBarcode, faBars, faBell as faBellSolid, faBlog, faBox, faBoxOpen, faBoxesStacked, faCalendarDays as faCalendarDaysSolid, faCalendarXmark as faCalendarXmarkSolid, faCamera as faCameraSolid, faCashRegister, faChartColumn, faChartLine, faCheck, faChevronDown, faChevronLeft, faChevronRight, faCircleCheck as faCircleCheckSolid, faCircleExclamation, faDumbbell, faEye as faEyeSolid, faEyeSlash as faEyeSlashSolid, faGaugeHigh, faGear, faGhost, faHandHoldingDollar, faList, faLock, faMobileScreenButton, faMoneyBillWave, faPaw, faReceipt, faRocket, faScissors, faSpa, faStar as faStarSolid, faTableCells, faTriangleExclamation, faTruck as faTruckSolid, faUnderline, faUser as faUserSolid, faUserGroup, faUserPlus, faUserTie, faUsers, faUsersSlash, faWandMagicSparkles, faXmark } from '@fortawesome/free-solid-svg-icons';
import { faBell as faBellRegular, faCalendarDays as faCalendarDaysRegular, faCalendarXmark as faCalendarXmarkRegular, faCamera as faCameraRegular, faCircleCheck as faCircleCheckRegular, faEye as faEyeRegular, faEyeSlash as faEyeSlashRegular, faStar as faStarRegular, faTruck as faTruckRegular, faUser as faUserRegular } from '@fortawesome/free-regular-svg-icons';
import { faApple, faEdge, faGoogle, faInstagram, faLine, faReact, faWhatsapp } from '@fortawesome/free-brands-svg-icons';

config.autoAddCss = false;
library.add(faWallet,faFileImport,faClockRotateLeft,faHeartPulse,faBullhorn, faListCheck, faRepeat, faBolt, faBuilding, faFileLines, faArrowRightArrowLeft, faArrowRightFromBracket, faArrowTrendDown, faArrowTrendUp, faBarcode, faBars, faBellSolid, faBlog, faBox, faBoxOpen, faBoxesStacked, faCalendarDaysSolid, faCalendarXmarkSolid, faCameraSolid, faCashRegister, faChartColumn, faChartLine, faCheck, faChevronDown, faChevronLeft, faChevronRight, faCircleCheckSolid, faCircleExclamation, faDumbbell, faEyeSolid, faEyeSlashSolid, faGaugeHigh, faGear, faGhost, faHandHoldingDollar, faList, faLock, faMobileScreenButton, faMoneyBillWave, faPaw, faReceipt, faRocket, faScissors, faSpa, faStarSolid, faTableCells, faTriangleExclamation, faTruckSolid, faUnderline, faUserSolid, faUserGroup, faUserPlus, faUserTie, faUsers, faUsersSlash, faWandMagicSparkles, faXmark, faBellRegular, faCalendarDaysRegular, faCalendarXmarkRegular, faCameraRegular, faCircleCheckRegular, faEyeRegular, faEyeSlashRegular, faStarRegular, faTruckRegular, faUserRegular, faApple, faEdge, faGoogle, faInstagram, faLine, faReact, faWhatsapp);

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
