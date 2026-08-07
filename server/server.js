import app from './app.js';
import { config } from '../config/env.js';

app.listen(config.port, () => {
    console.log(`LifeLine AI server listening at http://localhost:${config.port}`);
    console.log(`Timezone: ${config.timezone}`);
});
