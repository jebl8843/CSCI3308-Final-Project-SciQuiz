// this file runs on the backend

const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const tdbApi = require('./resources/js/tdbApi.js');

// adding the database connection verification

// WILL NEED TO CREATE/ADD THE DATABASE AND .ENV 
const dbConfig = {
    host: 'db',
    port: 5432,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
};


const db = pgp(dbConfig);


// test your database
db.connect()
.then(obj => {
  console.log('Database connection successful'); // you can view this message in the docker compose logs
  obj.done(); // success, release the connection;
})
.catch(error => {
  console.log('ERROR:', error.message || error);
});

app.set('view engine', 'ejs');
  // for checking to make sure connection to SQL database worked
  // take out for final product
  app.use(bodyParser.json());

  app.use(
      session({
        secret: "SECRET",
        saveUninitialized: false,
        resave: false,
      })
    );
    
    app.use(
      bodyParser.urlencoded({
        extended: true,
      })
    );

  app.get('/', (req, res) => {
    res.redirect('/login'); //this will call the /anotherRoute route in the API
  });

  // API calls for the login/register pages
  app.get('/login', (req,res) =>{
    res.render('pages/login');
  });

  app.get('/register', (req,res) =>{
    res.render('pages/register');
  });

  app.get('/profile', (req, res) =>
{
  res.render('pages/profile');
});

app.get('/home', (req, res) =>
{ const { name } = req.session;
  res.render('pages/home');
});


// API call for login page, gets the username and password to check agasint the SQL database

  app.post('/login', async (req, res) =>{
    const user = req.body.username;
    const query = "SELECT * FROM users WHERE username = $1";
    const values = [user];
    db.one(query, values)
            .then(async (data) => {
            user.username = data.username;
            user.password = data.password;
            const match = await bcrypt.compare(req.body.password, data.password);
            
            if (match)
            {
               // pass didnt match
               console.log('pass didnt match');
               res.redirect ('/login');
            } 
            else 
            {
                req.session.user = {
                  api_key: process.env.API_KEY,
                  name: user,
                };
                  req.session.save();
                  // redirect to quiz page 
                  res.redirect("/home");
            }
            
          })
            .catch((err) => {
            console.log(err);
            res.redirect("/register");
          });
});

  // Register submission
  app.post('/register', async (req, res) => {

    const user = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);
    const query = "INSERT INTO users (username, password) VALUES ($1, $2);";
    const q2 = "SELECT * FROM users WHERE username = $1;";
    db.task ('get-everything', task => {
      return task.batch ([
        task.any(query, [user, hash]),
        task.any(q2, [user])
      ])})
        .then(async (data) => {
            //data[1][0].username; // data is a 2d array to access the info we need index [1][0]
            
            if (data[1][0].username == user)
            {
              req.session.user = {
                username: req.body.username,
              };
              req.session.save();
              res.redirect("/home");
            }
            // if so then save session and contiunre to quiz page which is home.ejs
            else
            {
                req.session.user = {
                      api_key: process.env.API_KEY,
                      name: user,
                    };
                      req.session.save();
                      res.redirect("/login");
            }

          })
          .catch((err) => {
            console.log(err);
            // res.redirect("/register", user);
          });
    });


  // Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to register page.
    return res.redirect('/register');
  }
  next();
};


app.post('/leaderboard',(req,res) =>
{
  const query = "SELECT username FROM users ORDER BY correctAns DESC 3";
  db.any(query)
    .then((data)=>{
      res.render('pages/leaderboard',{
        data: data.username});     
    });
});

/*
app.post('/profile', (req,res) =>
{
  const query = "SELECT * from users where username = req.session.user.name";
  db.one(query)
  .then((data) =>
  {
    if(!data)
    {
      // send error
      const error = "error profile not found";
      res.render('/pages/profile', 
      {
        err: error, 
      })
    }
    else
    {
      const {userName} = data.name
      const {numWins} = data.quizTaken
      const {pass} = data.password
      const {correct} = data.correctAns

      // finish
      res.render('/pages/profile', 
      {
        username: userName,
        password: pass,
        numCorrect: correct,
        wins: numWins,
      })
    }
  })
});
*/

app.listen(3000);
  console.log('Server is listening on port 3000');