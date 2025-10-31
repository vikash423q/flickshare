import User from './model/user.js';
import Config from './config.js';

const setup = () => {
  // Any setup code can go here
  User.findOne({admin: true})
  .then(user => console.log('User already exists, no setup needed'))
  .catch(err => {
    console.error('Error during setup:', err);
    // If no user exists, create a default admin user
    const adminUser = new User({
        token: Config.adminToken,
        provisioned: true,
        admin: true
      });
    adminUser.save()
    .then(() => console.log('Admin user created successfully'))
    .catch(saveErr => console.error('Error creating admin user:', saveErr))
    });
}

export default setup;