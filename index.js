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

//routes
// const routes = require('./routes');
// app.use("/api", routes);

app.get("/api/records", function (req, res) {
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
        })

});

app.get('/test', function (req, res) {
    return res.json(req.query);
});


app.listen(8000, function () {
    console.log("Sever is running at port 8000...");
});