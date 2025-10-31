import dotenv from 'dotenv';
dotenv.config();

class Config {
    static PORT = process.env.PORT || 8081;
    static MONGODB_HOST = process.env.MONGODB_HOST;
    static MONGODB_USERNAME = process.env.MONGODB_USERNAME;
    static MONGODB_PASSWORD = process.env.MONGODB_PASSWORD;
    static DB_NAME = process.env.DB_NAME;
    static privateKey = process.env.PRIVATE_KEY;
    static adminToken = process.env.ADMIN_TOKEN;
}

console.log(Config.MONGODB_HOST);

export default Config;