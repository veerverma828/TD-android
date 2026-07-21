import { Image } from 'expo-image';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const INITIAL_SCALE_FACTOR = Dimensions.get('screen').height / 90;
const DURATION = 600;

export function AnimatedSplashOverlay() {
  const [animate, setAnimate] = useState(false);
  const [visible, setVisible] = useState(true);
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animate) return;
    // Mirrors the original Keyframe: hold at 0-20%, fade 1->0 across 20-70%
    // with an elastic ease-out, then hold transparent for 70-100% before unmount.
    Animated.sequence([
      Animated.delay(DURATION * 0.2),
      Animated.timing(opacity, {
        toValue: 0,
        duration: DURATION * 0.5,
        easing: Easing.elastic(0.7),
        useNativeDriver: true,
      }),
      Animated.delay(DURATION * 0.3),
    ]).start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [animate, opacity]);

  if (!visible) return null;

  const image = <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />;

  return animate ? (
    <Animated.View style={[styles.splashOverlay, { opacity }]}>{image}</Animated.View>
  ) : (
    <View
      onLayout={() => {
        SplashScreen.hideAsync().finally(() => {
          setAnimate(true);
        });
      }}
      style={styles.splashOverlay}>
      {image}
    </View>
  );
}

export function AnimatedIcon() {
  const backgroundScale = useRef(new Animated.Value(INITIAL_SCALE_FACTOR)).current;
  const logoScale = useRef(new Animated.Value(1.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const glowRotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(backgroundScale, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.elastic(0.7),
      useNativeDriver: true,
    }).start();

    // Keyframe held 0->40% then animated 40->100%.
    Animated.sequence([
      Animated.delay(DURATION * 0.4),
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: DURATION * 0.6,
          easing: Easing.elastic(0.7),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: DURATION * 0.6,
          easing: Easing.elastic(0.7),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Single slow 20-rotation sweep over 4 minutes (0 -> 7200deg), not looped.
    Animated.timing(glowRotation, {
      toValue: 20,
      duration: 60 * 1000 * 4,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  }, [backgroundScale, logoScale, logoOpacity, glowRotation]);

  const glowRotate = glowRotation.interpolate({ inputRange: [0, 20], outputRange: ['0deg', '7200deg'] });

  return (
    <View style={styles.iconContainer}>
      <Animated.View style={[styles.glow, { transform: [{ rotateZ: glowRotate }] }]}>
        <Image style={styles.glow} source={require('@/assets/images/logo-glow.png')} />
      </Animated.View>

      <Animated.View style={[styles.background, { transform: [{ scale: backgroundScale }] }]} />
      <Animated.View
        style={[styles.imageContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image style={styles.image} source={require('@/assets/images/expo-logo.png')} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    zIndex: 100,
  },
  image: {
    width: 76,
    height: 71,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #3C9FFE, #0274DF)`,
    width: 128,
    height: 128,
    position: 'absolute',
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
});
