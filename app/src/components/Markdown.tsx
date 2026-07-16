/**
 * Tiny, dependency-free Markdown renderer — enough for the legal/disclaimer
 * documents (headings, paragraphs, list items, bold, italics). Deliberately
 * minimal: these documents are short and hand-authored, so we avoid pulling in
 * a full Markdown library (and its transitive deps) for a few text styles.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../theme';

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  // Split on **bold** and _italic_ / *italic* while keeping delimiters.
  const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_|\*[^*]+\*)/g).filter(Boolean);
  return tokens.map((tok, i) => {
    const key = `${keyBase}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(tok)) {
      return (
        <Text key={key} style={{ fontWeight: '700' }}>
          {tok.slice(2, -2)}
        </Text>
      );
    }
    if (/^_[^_]+_$/.test(tok) || /^\*[^*]+\*$/.test(tok)) {
      return (
        <Text key={key} style={{ fontStyle: 'italic', color: colors.textMuted }}>
          {tok.slice(1, -1)}
        </Text>
      );
    }
    return <Text key={key}>{tok}</Text>;
  });
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const blocks: React.ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const key = `md-${i}`;

    if (trimmed.startsWith('### ')) {
      blocks.push(
        <Text key={key} style={[typography.subheading, styles.h3]}>
          {renderInline(trimmed.slice(4), key)}
        </Text>,
      );
    } else if (trimmed.startsWith('## ')) {
      blocks.push(
        <Text key={key} style={[typography.heading, styles.h2]}>
          {renderInline(trimmed.slice(3), key)}
        </Text>,
      );
    } else if (trimmed.startsWith('# ')) {
      blocks.push(
        <Text key={key} style={[typography.title, styles.h1]}>
          {renderInline(trimmed.slice(2), key)}
        </Text>,
      );
    } else if (/^[-*]\s+/.test(trimmed)) {
      blocks.push(
        <View key={key} style={styles.li}>
          <Text style={styles.bullet}>•</Text>
          <Text style={[typography.bodyMuted, styles.liText]}>
            {renderInline(trimmed.replace(/^[-*]\s+/, ''), key)}
          </Text>
        </View>,
      );
    } else {
      blocks.push(
        <Text key={key} style={[typography.bodyMuted, styles.p]}>
          {renderInline(trimmed, key)}
        </Text>,
      );
    }
  });

  return <View>{blocks}</View>;
}

const styles = StyleSheet.create({
  h1: { marginBottom: spacing.md },
  h2: { marginTop: spacing.lg, marginBottom: spacing.sm },
  h3: { marginTop: spacing.md, marginBottom: spacing.xs },
  p: { marginBottom: spacing.sm },
  li: { flexDirection: 'row', marginBottom: spacing.xs, paddingLeft: spacing.xs },
  bullet: { color: colors.textMuted, marginRight: spacing.sm, fontSize: 15, lineHeight: 22 },
  liText: { flex: 1 },
});
