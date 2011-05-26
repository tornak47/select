var select = require('select');

// Fixtures
function clearDB(collection, fn) {
  select.raw('DROP TABLE ' + collection, fn);
}

function initDB(collection, fn) {
  select.raw('CREATE TABLE ' + collection + ' (id INT AUTO_INCREMENT, name TEXT, email TEXT, INDEX USING BTREE (id));', fn);
}

function populateDB(collection, fn) {
  select.raw('INSERT INTO ' + collection + ' (name, email) VALUES ("Alex", "alex@example.com");' +
             'INSERT INTO ' + collection + ' (name, email) VALUES ("Bob",  "bob@example.com");' +
             'INSERT INTO ' + collection + ' (name, email) VALUES ("Yuka", "yuka@example.com");', fn);
}

function fixtures(collection, fn) {
  clearDB(collection, function() {
    initDB(collection, function() {
      populateDB(collection, function() {
        fn();
      });
    });
  });
}

// Setup function
exports['setUp'] = function(test, assert) {
  select.db = 'mysql://root@localhost/select-test';
  fixtures('users', test.finish);
};

// Tests
exports['test find by ID'] = function(test, assert) {
  select('users').
    find(1).
    each(function() {
      assert.equal('Alex', this.name);
      test.finish();
    });
};

exports['test find with values'] = function(test, assert) {
  select('users').
    find().
    values(function(values) {
      assert.ok(values.length > 0);
      test.finish();
    });
};

exports['test find with values with 0 matches'] = function(test, assert) {
  select('users').
    find({ name: 'Benny' }).
    values(function(values) {
      assert.equal(0, values.length);
      test.finish();
    });
};

exports['test find with an object'] = function(test, assert) {
  select('users').
    find({ name: 'Alex' }).
    each(function() {
      assert.equal('Alex', this.name);
      test.finish();
    });
};

exports['test find by itself'] = function(test, assert) {
  select('users').
    find(1, function(err, values) {
      assert.equal(1, values.length);
      test.finish();
    });
};

exports['test find with limit'] = function(test, assert) {
  var i = 0;
  select('users').
    find().
    limit(2).
    each(function() {
      i++;
      assert.ok(i < 3);
    }).
    after(function() {
      test.finish();
    });
};

exports['test find with offset'] = function(test, assert) {
  select('users').
    find().
    limit(1).
    offset(1).
    each(function() {
      assert.equal(this.name, 'Bob');
    }).
    after(function() {
      test.finish();
    });
};

exports['test find with sort'] = function(test, assert) {
  fixtures('admins', function() {
    select('admins').
      find().
      sort('name', 'desc').
      values(function(values) {
        assert.deepEqual(['Yuka', 'Bob', 'Alex'], values.map(function(u) { return u.name; }));
        test.finish();
      });
  });
};

exports['test find with selector'] = function(test, assert) {
  select('users[name="Alex", email="alex@example.com"]').
    values(function(values) {
      assert.ok(values.length > 0);
      for (var i = 0; i < values.length; i++) {
        assert.equal(values[i].name, 'Alex');
      }
      test.finish();
    });
};

exports['test attr with offset'] = function(test, assert) {
  fixtures('users2', function() {
    select('users2').
      find().
        limit(2).
        offset(1).
        sort('name').
      attr({ name: 'Alex 2' }, function() {
        select('users2').
          find().
          sort('name').
          values(function(values) {
            assert.deepEqual(['Alex', 'Alex 2', 'Alex 2'], values.map(function(u) { return u.name; }));
            test.finish();
          });
      });
  });
};

exports['test sql injection'] = function(test, assert) {
  fixtures('users3', function() {
    select('users3').
      find().
        limit(1).
        sort('name').
        values(function(values) {
          assert.deepEqual(['Alex'], values.map(function(u) { return u.name; }));
          test.finish();
        });
  });
};

exports['test add'] = function(test, assert) {
  select('users').
    add({ name: 'CTB', email: 'ctb@example.com' }).
    after(function() {
      select('users').
        find({ name: 'CTB' }).
        each(function() {
          assert.equal(this.name, 'CTB');
        }).
        after(function() {
          test.finish();
        });
    });
};

exports['test update'] = function(test, assert) {
  select('users').
    find({ name: 'Alex' }).
    attr({ name: 'Alex 2' });

  select('users').
    find({ name: 'Alex 2' }).
    each(function() {
      assert.equal(this.name, 'Alex 2');
    }).
    after(function() {
      test.finish();
    });
};

exports['test delete'] = function(test, assert) {
  select('users').
    find(3).
    del(function() {
      select('users').
        find(3, function(err, values) {
          assert.equal(0, values.length);
          test.finish();
        });
    });
};

exports['test delete all'] = function(test, assert) {
  fixtures('people', function() {
    select('people').del(function() {
      select('people').find(undefined, function(err, values) {
        assert.equal(0, values.length);
        test.finish();
      });
    });
  });
};

exports['test delete with query'] = function(test, assert) {
  fixtures('dudes', function() {
    select('dudes').del({ name: 'Alex' }, function() {
      select('dudes').find({ name: 'Alex' }, function(err, values) {
        assert.equal(0, values.length);
        test.finish();
      });
    });
  });
};

exports['test errors'] = function(test, assert) {
  select.on('error', function(err) {
    // Column or table
    assert.ok(err.message.match(/Unknown /));
    test.finish();
  });

  select('users').find({ xxx: 'yyy' }).each(function() {
  });
};

exports['test delete by ID'] = function(test, assert) {
  fixtures('folks', function() {
    select('folks').
      find({ name: 'Bob' }).
      values(function(values) {
        select('folks').
          del(values[0].id, function() {
            select('folks').
              find().
              values(function(values) {
                assert.ok(values.length > 0);
                assert.equal(0, values.filter(function(r) { return r.name === 'Bob'; }).length);
                test.finish();
              });
          });
      });
  });
};
