import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

//set initial user
let currentUserId = 7;

//getting the data from visited_countries database to display
async function checkVisisted() { 
  const result = await db.query("SELECT country_code FROM visited_countries v JOIN users u ON v.user_id = u.id WHERE u.id = $1", [currentUserId]);
    let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  return countries;
}

 let userdata;
async function Users() {
  const result = await db.query("SELECT * FROM users");
  userdata = result.rows;
  return userdata.find((user) => user.id == currentUserId);
}


//initial route
app.get("/", async (req, res) => {
  const countries = await checkVisisted();
  const currentUser = await Users();
  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: userdata,
    color:currentUser.color,
  });
});

//add country to the tracker
app.post("/add", async (req, res) => {
  const input = req.body["country"].trim();
  const currentUser=await Users();
  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%' ORDER BY LENGTH(country_name);",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const countryCode = data.country_code;
    try {
      await db.query(
        "INSERT INTO visited_countries (country_code, user_id) VALUES ($1, $2)",
        [countryCode, currentUserId]
    );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

//add users
app.post("/user", async (req, res) => {
    if(req.body.user){
      currentUserId=req.body.user;
      res.redirect("/");
    }
    else{
      res.render("new.ejs");
    } 
});


app.post("/new", async (req, res) => {
  try {
    let result = await db.query(
      "INSERT INTO users (name,color) VALUES ($1,$2) RETURNING id",
      [req.body.name,req.body.color]

    );
    const id = result.rows[0].id;
      currentUserId = id;
    res.redirect("/");
  } catch (err) {
    console.log(err);
  }

});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
