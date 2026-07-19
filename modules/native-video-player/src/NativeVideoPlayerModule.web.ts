import { registerWebModule, NativeModule } from 'expo';

class NativeVideoPlayerModule extends NativeModule<{}> {}

export default registerWebModule(NativeVideoPlayerModule, 'NativeVideoPlayerModule');
