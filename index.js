const express = require('express');
const app = express();
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');


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
  app.listen(3000);
  console.log('Server is listening on port 3000');

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
    //the logic goes here
    const user = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);

    const query = "INSERT INTO users (username, password) VALUES ($1, $2);"
    db.any (query, [user, hash])
        .then(async (data) => {
            user.username = data.user;
            hash.password = data.password;
            const match1 = await bcrypt.compare(req.body.password, data.password);

            // extra check to see if user exsists
            if (match1)
            {
                res.redirect("/register");
            }
            // if so then save session and contiunre to quiz page which is home.ejs
            else
            {
                req.session.user = {
                      api_key: process.env.API_KEY,
                      name: user,
                    };
                      req.session.save();
                      res.redirect("/home");
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

app.get('/profile', async (req, res) => {

    const query = "SELECT * FROM users WHERE username = $1"; //no way this works first try
    const rankquery = "SELECT COUNT(*) FROM USERS WHERE CAST(correctAns AS float)/quizTaken*5) > CAST((SELECT correctAns FROM users WHERE username = $1) AS float)/(SELECT quizTaken FROM users WHERE username = $1)*5)";
    db.any(query).then(async (data) => {
        db.any(rankquery).then(async (rank) => {
            res.render("/pages/profile", {
                username: data.username,
                quizTaken: data.quizTaken,
                correctAns: data.correctAns,
                rank: rank
            });
        });
    }).catch((err)=>{
        console.log(err);
        res.send("An error occurred obtaining profile information");
        res.redirect("/home");
    });
});

app.post('/profile', async (req, res) => {

    const query = null; //TODO once db is finalized
    db.any(query, [req/*TODO*/]).then(async (data) => {
        res.send("Updated successfully");//TODO update once db is finished
    }).catch((err)=>{
        console.log(err);
        res.send("An error occurred while updating profile information");
    });
});


/*
app.post('/home', (req,res) =>
{
  const query = "SELECT * from users where username = req.session.user.name";
  db.one(query)
  .then((data) =>
  {
    if(!data)
    {
      // send error
    }
    else
    {
      const {username} = data.name

      // finish
      res.render('/pages/profile'), 
      {
        username: 
      })
    }
    


  })
});
*/


// app.post('/home', (req,res) =>
// {
//   const query = "SELECT * from users where username = req.session.user.name";
//   db.one(query)
//   .then((data) =>
//   {
//     if(!data)
//     {
//       // send error
//     }
//     else
//     {
//       const {username} = data.name
//
//       // finish
//       res.render('/pages/profile',
//       {
//         username:
//       })
//     }
//
//
//
//   })
// });


