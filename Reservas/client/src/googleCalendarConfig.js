import { gapi } from 'gapi-script';

const CLIENT_ID = '690394227820-s5rdh2u4ovgn5pki0ldcusaovh6rtj1c.apps.googleusercontent.com';
const API_KEY = 'AIzaSyB_YbnhdLe9Ug7KuCT4HzBYSlsipjU4qNM';
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest"];
const SCOPES = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile";

export const initClient = () => {
  gapi.client.init({
    apiKey: API_KEY,
    clientId: CLIENT_ID,
    discoveryDocs: DISCOVERY_DOCS,
    scope: SCOPES,
  }).then(() => {
    console.log('GAPI client initialized');
  }).catch((error) => {
    console.error('Error initializing GAPI client:', error);
  });
};

export const handleAuthClick = async () => {
  await gapi.auth2.getAuthInstance().signIn();
  const profile = gapi.auth2.getAuthInstance().currentUser.get().getBasicProfile();
  return {
    email: profile.getEmail(),
    name: profile.getName(),
  };
};

export const handleSignoutClick = () => {
  gapi.auth2.getAuthInstance().signOut();
};