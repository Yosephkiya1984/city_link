import React from 'react';
import { Text, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Fonts, FontSize } from '../../theme';

export type TypographyVariant =
  | 'h1'
  | 'h2'
  | 'h3'
  | 'headline'
  | 'title'
  | 'body'
  | 'label'
  | 'sub'
  | 'hint'
  | 'mono';

interface TypographyProps extends TextProps {
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  weight?: 'normal' | 'bold' | '500' | '600' | '700' | '800' | '900';
}

export function Typography({
  variant = 'body',
  color,
  align = 'left',
  weight,
  style,
  children,
  ...props
}: TypographyProps) {
  const theme = useTheme();

  // Map variants to theme styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'h1':
        return { fontSize: FontSize['4xl'], fontFamily: Fonts.black, color: theme.text };
      case 'h2':
        return { fontSize: FontSize['3xl'], fontFamily: Fonts.black, color: theme.text };
      case 'h3':
        return { fontSize: FontSize['2xl'], fontFamily: Fonts.bold, color: theme.text };
      case 'headline':
        return { fontSize: FontSize.xl, fontFamily: Fonts.headline, color: theme.text };
      case 'title':
        return { fontSize: FontSize.lg, fontFamily: Fonts.bold, color: theme.text };
      case 'body':
        return { fontSize: FontSize.md, fontFamily: Fonts.body, color: theme.textSoft };
      case 'label':
        return { fontSize: FontSize.base, fontFamily: Fonts.label, color: theme.text };
      case 'sub':
        return { fontSize: FontSize.sm, fontFamily: Fonts.body, color: theme.sub };
      case 'hint':
        return { fontSize: FontSize.xs, fontFamily: Fonts.regular, color: theme.hint };
      case 'mono':
        return { fontSize: FontSize.sm, fontFamily: Fonts.mono, color: theme.textSoft };
      default:
        return { fontSize: FontSize.md, fontFamily: Fonts.body, color: theme.text };
    }
  };

  const variantStyles = getVariantStyles();

  const customStyles = {
    ...(color && { color }),
    textAlign: align,
    ...(weight && { fontWeight: weight }),
  };

  return (
    <Text style={[variantStyles, customStyles, style]} {...props}>
      {children}
    </Text>
  );
}
