import User from './model/user.js';
import Config from './config.js';
import { initRedis } from './websocket.js';
import { generateCuteName } from './util.js';

const setup = async () => {
  // Any setup code can go here
    User.findOne({admin: true})
    .then(user => {
      if (user) {
        console.log('Admin user already exists');
      } else {
        // If no admin user exists, create one
        const name = generateCuteName();
        const adminUser = new User({
          token: Config.adminToken,
          provisioned: true,
          admin: true,
          name: name
        });
        adminUser.save()
        .then(() => console.log('Admin user created successfully'))
        .catch(saveErr => console.error('Error creating admin user:', saveErr))
      }
      })
      .catch(err => {
        console.error('Error during setup:', err);
    });

    // Initialize Redis for WebSockets
    await initRedis();
}

export default setup;