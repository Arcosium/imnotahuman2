import {defineConfig} from 'vite';
export default defineConfig({envDir:false,server:{proxy:{'/api':'http://127.0.0.1:8682'}},build:{sourcemap:false}});
