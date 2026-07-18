import { StyleSheet } from 'react-native';

export const settingsStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 60,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 16,
    paddingBottom: 8,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  sectionSpacing: {
    marginTop: 22,
  },
  sectionNote: {
    fontSize: 11.5,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  rowStack: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  rowLabel: {
    fontSize: 14.5,
    fontWeight: '500',
  },
  rowSubtext: {
    fontSize: 11.5,
    marginTop: 2,
  },
  chevron: {
    fontSize: 18,
  },
  providerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  providerBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 6,
    borderWidth: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  colorSwatch: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 68,
    paddingVertical: 12,
    paddingHorizontal: 16,
    position: 'relative',
  },
  categoryRowDivider: {
    position: 'absolute',
    left: 68,
    right: 16,
    bottom: 0,
    height: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTextGroup: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 19,
  },
  categorySubtext: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 15,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    padding: 16,
  },
  cardInput: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14.5,
  },
  primaryButton: {
    marginTop: 12,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addonCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 14,
    padding: 14,
  },
  addonIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    paddingVertical: 32,
    alignItems: 'center',
  },
});
