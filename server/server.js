import express from 'express';
import Config from './config.js';

const app = express()

// Healthcheck endpoint
app.get('/healthcheck', (req, res) => {
  res.send('OK')
})

// Start the server
app.listen(Config.PORT, () => {
  console.log(`Example app listening on port ${Config.PORT}`)
})
