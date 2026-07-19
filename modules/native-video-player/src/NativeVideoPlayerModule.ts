import { NativeModule, requireNativeModule } from 'expo';

declare class NativeVideoPlayerModule extends NativeModule<{}> {}

export default requireNativeModule<NativeVideoPlayerModule>('NativeVideoPlayer');
