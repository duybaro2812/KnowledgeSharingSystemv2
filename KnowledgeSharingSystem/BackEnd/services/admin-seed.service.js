const bcrypt = require('bcrypt');
const userModel = require('../models/user.model');

const DEFAULT_ADMIN = {
    username: 'admin123',
    password: 'admin123',
    name: 'Administrator',
    email: 'admin123@kss.local',
};

const seedDefaultAdmin = async () => {
    const users = await userModel.getUsers();
    const existingAdmin = users.find((user) => user.role === 'admin');

    if (existingAdmin) {
        return;
    }

    const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    await userModel.registerUser({
        username: DEFAULT_ADMIN.username,
        name: DEFAULT_ADMIN.name,
        email: DEFAULT_ADMIN.email,
        passwordHash,
        role: 'admin',
    });

    console.log(`Default admin account "${DEFAULT_ADMIN.username}" has been created.`);
};

module.exports = {
    seedDefaultAdmin,
};
