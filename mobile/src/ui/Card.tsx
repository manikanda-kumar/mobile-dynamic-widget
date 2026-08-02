import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

export function Card({
  children,
  level = 1,
  padded = true,
  style,
}: {
  children: React.ReactNode;
  level?: 0 | 1 | 2;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View
      style={[
        t.card(level),
        padded ? { padding: t.sp(4) } : null,
        // Fills the cell when a layout stretches its slot (grid rows, rails),
        // stays content-sized everywhere else.
        { overflow: 'hidden', flexGrow: 1 },
        style,
      ]}
    >
      {children}
    </View>
  );
}
