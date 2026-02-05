import { useColorScheme } from 'react-native';
import { Colors } from './colors';

export const useTheme = () => {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    colors: isDark ? Colors.dark : Colors.light,
    isDark,
  };
};
