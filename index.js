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
    async: true,
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

app.get('/home', (req, res) =>
{ const { name } = req.session;
  res.render('pages/home', {categories: tdbApi.categories});
  // trying to get the value of the category button in home.ejs, idk how
  // function myFunction() {
  //   const x = document.getElementById("category").value;
  //   console.log(x)
  //   //document.getElementById("demo").innerHTML = x;
  // }
});


// API call for login page, gets the username and password to check agasint the SQL database

  app.post('/login', async (req, res) =>{
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);
    const query = "SELECT * FROM users WHERE username = $1";
    const values = [username, hash];
    db.one(query, values)
            .then(async (data) => {
            // user.username = data.username;
            // user.password = data.password;
            const match = await bcrypt.compare(hash, data.password);
            
            if (match)
            {
              req.session.user = {
                api_key: process.env.API_KEY,
                username: username,
              };
                req.session.save();
               res.redirect ('/home');
            } 
            else 
            {
                  // redirect to quiz page 
                  res.redirect("/login");
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
    const query = "INSERT INTO users (username, password, quizTaken, correctAns) VALUES ($1, $2, 0, 0);";
    const q2 = "SELECT * FROM users WHERE username = $1;";
    db.task ('get-everything', task => {
      return task.batch ([
        task.any(query, [user, hash]),
        task.any(q2, [user])
      ])})
        .then(async (data) => {
            res.redirect("/login");
          })
          .catch((err) => {
            console.log(err);
            // res.redirect("/register", user);
          });
          //res.redirect("/home");
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
    if(req.session.user === undefined){
        console.log("error no current user session");
        res.send("error no current user session");
    }
    const user = req.session.user.username;
    const query = "SELECT * FROM users WHERE username = $1"; //no way this works first try
    const rankquery = "SELECT COUNT(*) FROM USERS WHERE (CAST(correctAns AS float)/(quizTaken+.000001)*1) > CAST((SELECT correctAns FROM users WHERE username = $1) AS float)/((SELECT quizTaken FROM users WHERE username = $1)+.000001)*1";
    //console.log(rankquery);
    db.any(query, user).then(async (data) => {
        db.any(rankquery, user).then(async (rank) => {
            res.render("pages/profile", {
                username: data[0].username,
                quiztaken: data[0].quiztaken,
                correctans: data[0].correctans,
                rank: rank[0].count + 1
            });
            // res.send({
            //     data:data,
            //     username: data[0].username,
            //     quiztaken: data[0].quiztaken,
            //     correctans: data[0].correctans,
            //     rank: rank[0].count + 1
            // });
        });
    }).catch((err)=>{
        console.log(err);
        res.send("An error occurred obtaining profile information");
        res.redirect("/home");
    });
});

app.post('/profile', async (req, res) => {
    const user = req.session.user.username;
    console.log(req.body.correctans);
    const query = "UPDATE users SET quizTaken = quizTaken + $2, correctAns = correctAns + $3 WHERE username = $1";
    db.any(query, [user, 1, req.body.correctans]).then(async (data) => {
        // res.send("Updated successfully");//TODO update once db is finished
    }).catch((err)=>{
        console.log(err);
        // res.send("An error occurred while updating profile information");
    });
});


app.get('/gentest',(req,res) =>
{
    db.any("TRUNCATE TABLE users;");
    let passwords = ["number1", "1234", "overflow", "1342"];
    let hashes = ["","","",""];
    for(let i = 0; i < passwords.length; i++){
        hashes[i] = bcrypt.hash(passwords[i], 10);
    }
    const query = "INSERT INTO users (username, password, quizTaken, correctAns) VALUES "
                    +"('first', $1, 6, 28),"
                    +"('failure', $2, 4, 0),"
                    +"('mchackerson', $3, 3, 700),"
                    +"('lessbad', $4, 5, 8)";
    db.any(query, hashes)
        .then((data)=>{
            res.redirect('/');
        });
});

app.get('/leaderboard',(req,res) =>
{
  const ranking = "SELECT username, (CAST(correctAns AS float)/((quizTaken+0.0001)*1)*100) AS leaderboard FROM users ORDER BY leaderboard DESC 10"

  db.any(ranking)
    .then((ranking)=>{
      res.render('pages/leaderboard',{
        data: ranking});     
    });
});

app.get('/quiz', async (req, res) => {
    const {category, difficulty} = req.query;
    const question = await tdbApi.getQuestion(category, difficulty);
    console.log('Starting a quiz:', question)
    res.render('pages/quiz', {question});
});


/**
 * Called when a user ends a quiz, either they won or lost.
 * @param {boolean} correct - True if the user won, false if they lost.
 * @param {string} location - url of the page to redirect to once they view the results.
 */
app.get('/quizOver', async (req, res) => {
    res.render('pages/quizOver', {correct: req.query.correct, location: req.query.location});
});


app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});


app.listen(3000);
  console.log('Server is listening on port 3000');
