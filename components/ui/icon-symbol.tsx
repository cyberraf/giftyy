// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolViewProps, SymbolWeight } from 'expo-symbols';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

export type IconSymbolName = SymbolViewProps['name'];

/**
 * Add your SF Symbols to vector icon mappings here.
 */
const MAPPING: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  'house.fill': 'home',
  'paperplane.fill': 'send',
  'chevron.left.forwardslash.chevron.right': 'code',
  'chevron.right': 'chevron-right',
  // Commonly used across the app
  magnifyingglass: 'search',
  bell: 'notifications',
  'slider.horizontal.3': 'tune',
  heart: 'favorite-border',
  'heart.fill': 'favorite',
  'chevron.left': 'chevron-left',
  'square.and.arrow.up': 'send',
  'square.and.pencil': 'edit',
  'qrcode.viewfinder': 'qr-code-scanner',
  'rectangle.grid.2x2': 'dashboard',
  'doc.plaintext': 'local-shipping',
  'person.2.fill': 'group',
  'gearshape.fill': 'settings',
  'star.fill': 'star',
  star: 'star-border',
  'cart.fill': 'shopping-cart',
  cart: 'shopping-cart',
  'person.fill': 'person',
  'camera.fill': 'video-library',
  'play.rectangle.on.rectangle': 'video-library',
  'play.rectangle.on.rectangle.fill': 'video-library',
  'video.fill': 'videocam',
  'photo.fill': 'photo',
  house: 'home',
  'gift.fill': 'card-giftcard',
  xmark: 'close',
  'info.circle': 'info',
  'checkmark.circle.fill': 'check-circle',
  checkmark: 'check',
  'plus.circle.fill': 'add-circle',
  plus: 'add',
  trash: 'delete',
  'creditcard.fill': 'credit-card',
  'xmark.circle.fill': 'cancel',
  'chevron.up': 'keyboard-arrow-up',
  'chevron.down': 'keyboard-arrow-down',
  'doc.text.magnifyingglass': 'description',
  'doc.on.doc': 'content-copy',
  'location.fill': 'location-on',
  'person.circle.fill': 'account-circle',
  'lock.fill': 'lock',
  'shield.fill': 'security',
  'hand.raised.fill': 'pan-tool',
  'doc.plaintext.fill': 'description',
  'tray.full.fill': 'inbox',
  'square.and.arrow.up.fill': 'file-upload',
  'trash.fill': 'delete',
  'arrow.right.square.fill': 'logout',
  'doc.text.fill': 'description',
  'externaldrive.fill': 'storage',
  calendar: 'calendar-today',
  'envelope.fill': 'email',
  'play.fill': 'play-arrow',
  'arrow.down.circle.fill': 'arrow-circle-down',
  'arrow.up.circle.fill': 'arrow-circle-up',
  'ellipsis.circle': 'more-vert',
  // Category icons
  'heart.circle.fill': 'favorite',
  'tree.fill': 'park',
  'heart.2.fill': 'favorite',
  'face.smiling.fill': 'sentiment-satisfied',
  'paintbrush.fill': 'brush',
  sparkles: 'auto-awesome',
  'square.grid.2x2': 'grid-view',
  'tag.fill': 'local-offer',
  'storefront.fill': 'store',
  'rectangle.grid.2x2': 'apps',
  'square.grid.3x3': 'grid-on',
  'arrow.right': 'arrow-forward',
  'arrow.triangle.2.circlepath': 'flip-camera-ios',
  'arrow.counterclockwise': 'refresh',
  'bolt.fill': 'flash-on',
  'bolt.slash.fill': 'flash-off',
  'flame.fill': 'local-fire-department',
  snowflake: 'ac-unit',
  'clock.fill': 'schedule',
  'dollarsign.circle.fill': 'attach-money',
  photo: 'image',
};

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  const iconName = MAPPING[name];
  if (!iconName) {
    return null;
  }
  return <MaterialIcons color={color} size={size} name={iconName} style={style} />;
}
