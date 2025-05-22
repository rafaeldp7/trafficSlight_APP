// src/config/appwriteConfig.js
import { Client, Account } from 'react-native-appwrite';

const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('traffic-slight-appwrite')
  .setPlatform('com.trafficslight');

const account = new Account(client);

export { client, account };
