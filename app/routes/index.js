var express = require('express');
var router = express.Router();
var multer = require('multer');
var fetch = require('node-fetch')
var fs = require('fs')

// Database Connection // 
var mysql = require('mysql');
var db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '@virbalas.8//',
  database: 'if_terminal_db',
  debug: false
});

// Login Modules
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

// Login Session //
router.use(session({
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}));

// Set Storage Engine //
const storage = multer.diskStorage({
  destination: './public/uploads/',
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Image Upload
const upload = multer({
  storage: storage,
  limits: { fileSize: 2000000 },
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  }
}).single('image');

function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLocaleLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}

router.post('/upload', (req, res) => {
  upload(req, res, (err) => {
    if (err) {
      res.render('images', {
        msg: err
      });
    } else {
      if (req.file == undefined) {
        res.render('images', {
          msg: 'Error: No File Selected!'
        });
      } else {
        db.query('INSERT INTO images SET name = ?', req.file.filename, function (err, res) {
          if (err) throw err;
        });
        res.render('images', { title: "Image Gallery", msg: 'File Uploaded!' });
      }
    }
  });
});

// Video File Upload //
const upload2 = multer({
  storage: storage,
  limits: { fileSize: 10000000 },
  fileFilter: function (req, file, cb) {
    checkFileType2(file, cb);
  }
}).single('video');

router.post('/uploadvideo', (req, res) => {
  upload2(req, res, (err) => {
    if (err) {
      res.render('videos', {
        msg: err
      });
    } else {
      if (req.file == undefined) {
        res.render('videos', {
          msg: 'Error: No File Selected!'
        });
      } else {
        db.query('INSERT INTO videos SET name = ?', req.file.filename, function (err, res) {
          if (err) throw err;
        });
        res.render('videos', {
          msg: 'File Uploaded!'
        });
      }
    }
  });
});

function checkFileType2(file, cb) {
  const filetypes = /mp4|wmw|avi|mov/;
  const extname = filetypes.test(path.extname(file.originalname).toLocaleLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Videos Only!');
  }
}

// Modules File Upload //
const upload3 = multer({
  storage: storage,
  limits: { fileSize: 100000000 },
  fileFilter: function (req, file, cb) {
    checkFileType3(file, cb);
  }
}).single('modules');

function checkFileType3(file, cb) {
  const filetypes = /json/;
  const extname = filetypes.test(path.extname(file.originalname).toLocaleLowerCase());
  const mimetype = filetypes.test(file.mimetype);
  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: JSON Only!');
  }
}

router.post('/uploadjson', (req, res) => {
  upload3(req, res, (err) => {
    if (err) {
      res.render('modules', {
        msg: err
      });
    } else if (req.file == undefined) {
      res.render('modules', { msg: 'Error: No File Selected!' }
      );
    } else
      try {
        const filepath = path.resolve(req.file.path)
        const buff = fs.readFileSync(filepath)
        const data = JSON.parse(buff.toString())
        const fields = data.map(entry => [
          entry.studyProgramme,
          entry.subgroup,
          entry.title,
          entry.start,
          entry.end,
          entry.classroom,
          entry.type,
          entry.weekday
        ]
          .map(x => '"' + x + '"')
          .join(", ")
        )

        fields.forEach(field => {
          const queryStr = `INSERT INTO study_modules (studyProgramme, subgroup, title, start, end, classroom, type, weekday) VALUES (${field});`
          db.query(
            queryStr,
            (err, _) => {
              if (err) throw err;
            }
          );
          res.render('modules', { msg: 'File Uploaded!' });
        });
      } catch (err) {
        res.render('modules', { msg: 'Error Uploading File!' });
      }
  });
});

//Weather Api Module //
const request = require('request');

// Login Body Parser Usage //
router.use(bodyParser.urlencoded({ extended: true }));
router.use(bodyParser.json());

router.get('/modules', function (req, res) {
  db.query('SELECT * FROM study_modules', function (err, rs) {
    res.send({ times: rs });
  });
});

router.get('/clock', function (req, res) {
  db.query('SELECT * FROM clock', function (err, rs) {
    res.send({ clock: rs });
  });
});

router.get('/img', function (req, res) {
  db.query('SELECT * FROM images', function (err, rs) {
    res.send({ images: rs });
  });
});

router.get('/videos', function (req, res) {
  db.query('SELECT * FROM videos', function (err, rs) {
    res.send({ videos: rs });
  });
});

router.get('/getdate', function (req, res) {
  function today() {
    var dayarray = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    var today = new Date();
    var d = today.getDay();
    return dayarray[d]
  }
  res.send({ todayStr: today() });
});

router.get('/weather', function (req, res) {

  let apiKey = '31abc347521ec22e663ec914078ad77b';
  let city = 'kaunas';
  let url = `http://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${apiKey}`

  request(url, function (err, response, body) {
    if (err) {
      console.log('error:', error);
    } else {
      let weather = JSON.parse(body)
      let weatherInfo = {
        temp: weather.main.temp,
        desc: weather.weather[0].main,
        city: weather.name
      }
      res.send({ weather: weatherInfo })
    }
  });
});

function get(url) {
  return new Promise((resolve, reject) => {
    fetch(url)
      .then(res => res.json())
      .then(data => resolve(data))
      .catch(err => reject(err))
  })
}

// Handling Multiple Queries
router.get('/', (req, res) => {
  Promise.all([
    get(`http://localhost:3000/modules`),
    get(`http://localhost:3000/clock`),
    get(`http://localhost:3000/img`),
    get(`http://localhost:3000/videos`),
    get(`http://localhost:3000/weather`),
    get(`http://localhost:3000/getdate`),
  ]).then(([{ times }, { clock }, { images }, { videos }, { weather }, { todayStr }]) =>
    res.render('index', {
      times: times,
      clock: clock,
      images: images,
      weather: weather,
      videos: videos,
      todayStr: todayStr
    }))
    .catch(err => res.send('Ops, something has gone wrong'))
});

router.get('/modulesList', function (req, res, next) {
  db.query('SELECT * FROM study_modules', function (err, rs) {
    res.render('modulesList', { modules: rs });
  });
});

router.get('/form', function (req, res, next) {
  res.render('form', { module: {} });
});

router.post('/form', function (req, res, next) {
  db.query('INSERT INTO study_modules SET ?', req.body, function (err, rs) {
    res.redirect('/modulesList');
  });
});

router.get('/delete', function (req, res, next) {
  db.query('DELETE FROM study_modules WHERE id = ?', req.query.id, function (err, rs) {
    res.redirect('/modulesList');
  });
});

router.get('/edit', function (req, res, next) {
  db.query('SELECT * FROM study_modules WHERE id =?', req.query.id, function (err, rs) {
    res.render('form', { module: rs[0] });
  });
});

router.post('/edit', function (req, res, next) {
  var param = [
    req.body,
    req.query.id
  ]
  db.query('UPDATE study_modules SET ? WHERE id = ?', param, function (err, rs) {
    res.redirect('/modulesList');
  });
});

// Login //
router.get('/login', function (req, res, next) {
  res.render('login');
});

// Login Auth Check //
router.post('/auth', function (request, response) {
  var username = request.body.username;
  var password = request.body.password;
  if (username && password) {
    db.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function (error, results, fields) {
      if (results.length > 0) {
        request.session.loggedin = true;
        request.session.username = username;
        response.redirect('/adminpanel');
      } else {
        response.render('login', { message: 'Incorrect Username or Password! Please try again.' });
      }
      response.end();
    });
  } else {
    response.send('Please enter Username and Password!');
    response.end();
  }
});

// Logout //
router.get('/logout', function (req, res, next) {
  if (req.session) {
    req.session.destroy(function (err) {
      if (err) {
        return next(err);
      } else {
        return res.redirect('/login');
      }
    });
  }
});

router.get('/adminpanel', function (req, res) {
  res.render('adminpanel', { title: "Admin Panel" });
});

router.get('/imagesadd', function (req, res) {
  res.render('images', { title: "Image Upload" });
});

router.get('/modulesadd', function (req, res) {
  res.render('modules', { title: "Modules Upload" });
});

router.get('/videosadd', function (req, res) {
  res.render('videos', { title: "Video Upload" });
});

router.get('/imagegallery', function (req, res) {
  db.query('SELECT * FROM images', function (err, rs) {
    res.render('imagegallery', { title: "Image Gallery", images: rs });
  });
});

router.get('/videogallery', function (req, res) {
  db.query('SELECT * FROM videos', function (err, rs) {
    res.render('videogallery', { title: "Video Gallery", videos: rs });
  });
});

router.get('/deleteimg', function (req, res, next) {
  db.query('DELETE FROM images WHERE id = ?', req.query.id, function (err, rs) {
    res.redirect('/imagegallery');
  });
});

router.get('/deletevideo', function (req, res, next) {
  db.query('DELETE FROM videos WHERE id = ?', req.query.id, function (err, rs) {
    res.redirect('/videogallery');
  });
});

module.exports = router;