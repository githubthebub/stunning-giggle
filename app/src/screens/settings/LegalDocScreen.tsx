/**
 * Renders one of the placeholder legal documents (disclaimer / terms / privacy)
 * from the bundled Markdown. Read-only.
 */
import React from 'react';
import { Screen, Spacer } from '../../components/ui';
import { Markdown } from '../../components/Markdown';
import type { MainStackScreenProps } from '../../navigation/types';
import { disclaimerMarkdown, termsMarkdown, privacyMarkdown } from '../../data/content/registry';
import { spacing } from '../../theme';

const DOCS = {
  disclaimer: disclaimerMarkdown,
  terms: termsMarkdown,
  privacy: privacyMarkdown,
};

export function LegalDocScreen({ route }: MainStackScreenProps<'LegalDoc'>) {
  const source = DOCS[route.params.doc] ?? '';
  return (
    <Screen>
      <Markdown source={source} />
      <Spacer size={spacing.xl} />
    </Screen>
  );
}
