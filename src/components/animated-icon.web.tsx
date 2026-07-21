import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

import classes from './animated-icon.module.css';
const DURATION = 300;
const POP_DURATION = 720; // ~0.3% of the 4-minute glow sweep, matches original keyframe timing
const SPIN_DURATION = 60 * 1000 * 4 - POP_DURATION;

export function AnimatedSplashOverlay() {
  return null;
}

export function AnimatedIcon() {
  const backgroundScale = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(1.2)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowRotation = useRef(new Animated.Value(-180)).current;
  const glowScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(backgroundScale, {
        toValue: 1.2,
        duration: DURATION * 0.6,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.timing(backgroundScale, {
        toValue: 1,
        duration: DURATION * 0.4,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
    ]).start();

    // Scale holds at 1.2 (its first defined keyframe value) until 60%, then
    // settles to 1 while opacity fades in over the same tail segment.
    Animated.sequence([
      Animated.delay(DURATION * 0.6),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: DURATION * 0.4,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: DURATION * 0.4,
          easing: Easing.elastic(1.2),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Quick elastic pop-in (rotate/scale/opacity), then one slow continuous
    // spin for the remainder of the 4-minute sweep.
    Animated.sequence([
      Animated.parallel([
        Animated.timing(glowRotation, {
          toValue: 0,
          duration: POP_DURATION,
          easing: Easing.elastic(0.7),
          useNativeDriver: true,
        }),
        Animated.timing(glowScale, {
          toValue: 1,
          duration: POP_DURATION,
          easing: Easing.elastic(0.7),
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: POP_DURATION,
          easing: Easing.elastic(0.7),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(glowRotation, {
        toValue: 7200,
        duration: SPIN_DURATION,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backgroundScale, logoScale, logoOpacity, glowRotation, glowScale, glowOpacity]);

  const glowRotate = glowRotation.interpolate({ inputRange: [-180, 7200], outputRange: ['-180deg', '7200deg'] });

  return (
    <View style={styles.iconContainer}>
      <Animated.View
        style={[styles.glow, { opacity: glowOpacity, transform: [{ rotateZ: glowRotate }, { scale: glowScale }] }]}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={[styles.background, { transform: [{ scale: backgroundScale }] }]}>
        <div className={classes.expoLogoBackground} />
      </Animated.View>

      <Animated.View
        style={[styles.imageContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
    zIndex: 1000,
    position: 'absolute',
    top: 128 / 2 + 138,
  },
  imageContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    width: 201,
    height: 201,
    position: 'absolute',
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 128,
    height: 128,
  },
  image: {
    position: 'absolute',
    width: 76,
    height: 71,
  },
  background: {
    width: 128,
    height: 128,
    position: 'absolute',
  },
});
