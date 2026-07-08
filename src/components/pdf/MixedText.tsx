// ---------------------------------------------------------------------------
// NOA Inventory -- MixedText
// <Text> replacement for PDF strings that may mix scripts. Splits the string
// into runs so CJK characters render in NotoSansSC while Latin characters
// keep AnzianoPro (switching the whole line to NotoSansSC drops AnzianoPro
// for the non-Chinese part). Arabic-containing strings keep the whole-string
// NotoSansArabic treatment — raw RTL must not be split here, textkit's BiDi
// handling is fragile (see lib/arabicTextForPDF.ts).
// ---------------------------------------------------------------------------

import { Text } from '@react-pdf/renderer';
import type { Style } from '@react-pdf/types';
import { hasArabic, hasCJK, splitCJKRuns } from './PDFStyles';

interface MixedTextProps {
  style?: Style | Style[];
  children: string | null | undefined;
}

export function MixedText({ style, children }: MixedTextProps) {
  const text = children ?? '';
  const styleList = style == null ? [] : Array.isArray(style) ? style : [style];

  if (hasArabic(text)) {
    return <Text style={[...styleList, { fontFamily: 'NotoSansArabic' }]}>{text}</Text>;
  }
  if (!hasCJK(text)) {
    return <Text style={styleList}>{text}</Text>;
  }
  return (
    <Text style={styleList}>
      {splitCJKRuns(text).map((run, i) =>
        run.cjk
          ? <Text key={i} style={{ fontFamily: 'NotoSansSC' }}>{run.text}</Text>
          : <Text key={i}>{run.text}</Text>,
      )}
    </Text>
  );
}
