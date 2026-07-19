import { Component, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';
import { FocusablePressable } from './tv/FocusablePressable';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Unhandled render error:', error);
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <ThemedText style={styles.title}>Something went wrong</ThemedText>
          <ThemedText style={styles.message}>{this.state.error.message}</ThemedText>
          <FocusablePressable style={styles.button} onPress={this.reset} hasTVPreferredFocus focusRingBorderRadius={8} accessibilityRole="button" accessibilityLabel="Try again">
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </FocusablePressable>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
    gap: 12,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  message: {
    color: '#aaa',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    marginTop: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
