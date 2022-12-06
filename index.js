const express = require('express');
const app = express();

//mongo
const mongojs = require('mongojs');
const db = mongojs("travel", ["records"]);

//body-parser
const bodyParser = require('body-parser');

//validator
const {
    body,
    param,
    validationResult
} = require('express-validator');

//uses
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(bodyParser.json());

//CORS
app.use(function (req, res, next) {
    res.append("Access-Control-Allow-Origin", "*");
    res.append("Access-Control-Allow-Methods", "*");
    res.append("Access-Control-Allow-Headers", "*");
    next();
});

//routes
// const routes = require('./routes');
// app.use("/api", routes);

//GET
app.get("/api/records", auth, function (req, res) {
    const options = req.query;

    const sort = options.sort || {};
    const filter = options.filter || {};
    const limit = 10;
    const page = parseInt(options.page) || 1;
    const skip = (page - 1) * limit;

    for (i in sort) {
        sort[i] = parseInt(sort[i]);
    }

    db.records.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit, function (err, data) {
            if (err) {
                return res.sendStatus(500);
            } else {
                return res.status(200).json({
                    meta: {
                        skip,
                        limit,
                        sort,
                        filter,
                        page,
                        total: data.length
                    },
                    data,
                    links: {
                        self: req.originalUrl
                    }
                });
            }
        });

});

//POST
app.post('/api/records', [
    body('name').not().isEmpty(),
    body('from').not().isEmpty(),
    body('to').not().isEmpty()
], function (req, res) {

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    db.records.insert(req.body, function (err, data) {
        if (err) {
            return res.status(500);
        }

        const _id = data._id;

        res.append("Location", "/api/records/" + _id);

        return res.status(201).json({
            meta: {
                _id
            },
            data
        });
    });
})

//PUT
app.put('/api/records/:id', [
    param("id").isMongoId(),
], function (req, res) {
    const _id = req.params.id;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array()
        });
    }

    db.records.count({
        _id: mongojs.ObjectID(_id)
    }, function (err, count) {
        if (count) {
            const record = {
                _id: mongojs.ObjectID(_id),
                ...req.body
            };

            db.records.save(record, function (err, data) {
                return res.status(200).json({
                    meta: {
                        _id
                    },
                    data
                })
            })
        } else {
            db.records.save(req.body, function (err, data) {
                return res.status(201).json({
                    meta: {
                        _id: data.id,
                    },
                    data
                });
            });
        }
    });
});


//PATCH
app.patch('/api/records/:id', [param('id').isMongoId()], function (req, res) {
    const _id = req.params.id;

    db.records.count({
        _id: mongojs.ObjectID(_id)
    }, function (err, count) {
        if (count) {
            db.records.update({
                _id: mongojs.ObjectID(_id)
            }, {
                $set: req.body
            }, {
                multi: false
            }, function (err, data) {
                db.records.find({
                    _id: mongojs.ObjectID(_id)
                }, function (err, data) {
                    return res.status(200).json({
                        meta: {
                            _id
                        },
                        data
                    })
                });
            });
        } else {
            return res.sendStatus(404);
        }
    });
})

//DELETE
app.delete("/api/records/:id", auth, onlyAdmin, function (req, res) {
    const _id = req.params.id;

    db.records.count({
        _id: mongojs.ObjectID(_id)
    }, function (err, count) {
        if (count) {
            db.records.remove({
                _id: mongojs.ObjectID(_id)
            }, function (err, data) {
                return res.sendStatus(204);
            })
        } else {
            return res.sendStatus(404);
        }
    });
});

//SHOW 
// app.get('/api/records/:id', [
//     param('id').isMongoId()
// ], function (req, res) {
//     const _id = req.params.id;

//     db.records.find({
//         _id: mongojs.ObjectID(_id)
//     }, function (data) {

//         //need to handle errors
//         return res.status(200).json({
//             meta: {
//                 _id
//             },
//             data,
//             links: {
//                 self: req.originalUrl
//             }
//         })
//     });
// });


//JWT
const jwt = require('jsonwebtoken');
const secret = "Minatozaki Sana";

const users = [{
        username: "Momo",
        password: "password",
        role: "user"
    },
    {
        username: "Thar Khant",
        password: "password",
        role: "admin"
    }
];

app.post("/api/login", function (req, res) {
    const {
        username,
        password
    } = req.body;

    const user = users.find(function (u) {
        return u.username === username && u.password === password;
    });

    if (user) {
        jwt.sign(user, secret, {
            expiresIn: "1h"
        }, function (err, token) {
            return res.status(200).json({
                token
            });
        });
    } else {
        return res.sendStatus(401);
    }
});


//check auth token
function auth(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.sendStatus(401);

    const [
        type,
        token
    ] = authHeader.split(" ");

    if (type !== "Bearer") return res.sendStatus(401);

    jwt.verify(token, secret, function (err, data) {
        if (err) return res.sendStatus(401);
        else next();
    });
}

//check authorization
function onlyAdmin(req, res, next) {
    const [type, token] = res.headers["authorization"].split(' ');

    jwt.verify(token, secret, function (err, user) {
        if (user.role === "admin") next();
        else return res.sendStatus(403);
    })
}

app.listen(8000, function () {
    console.log("Sever is running at port 8000...");
});