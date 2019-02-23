require('dotenv').config({ path: 'test.env' });

const mongoose = require('mongoose');
const app = require('../app.js');
const dbConnect = require('../data');
const chai = require('chai');
const request = require('supertest');
const expect = chai.expect;

describe('/ping integration tests', () => {
    before(done => {
        dbConnect(process.env.DB_CONNECTION_STRING);
        mongoose.connection.on('connected', () => {
            //drop collections
            mongoose.connection.db.dropCollection('pings');

            done();
        });
    });

    after(done => {
        mongoose.connection.close(done);
    });

    describe('GET /hello', () => {
        it('returns hello text', async () => {
            let res = await request(app)
                .get('/ping/hello');

            expect(res.statusCode).to.equal(200);
            expect(res.text).to.match(/hello/i);
        });
    });

    describe('GET /error', () => {
        it('should throw', async () => {
            let res = await request(app).get('/ping/error');

            expect(res.body).to.have.property('message');
            expect(res.statusCode).equal(500);
        });
    });

    describe('GET /db', () => {
        it('should insert a test item in the database', async () => {
            let res = await request(app)
                .get('/ping/db');

            let ping = require('../data/ping.js');
            let pings = await ping.find({});

            expect(pings.length).to.equal(1);
            expect(res.statusCode).to.equal(201);
        }).timeout(0);
    });
});