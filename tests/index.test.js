const axios = require('axios');
const tdbApi = require('../resources/js/tdbApi.js');

test('does /quiz give a valid quiz?', async () => {
    const category = tdbApi.categories[Math.random() * tdbApi.categories.length];
    const difficulty = tdbApi.difficulties[Math.random() * tdbApi.difficulties.length];

    const resp = await axios.get(`/quiz?category=${category}&difficulty=${difficulty}`);
    console.log(resp.data);
})