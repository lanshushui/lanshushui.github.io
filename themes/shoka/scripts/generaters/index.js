'use strict';

const fs = require('hexo-fs');
const pagination = require('hexo-pagination');

hexo.config.index_generator = Object.assign({
  per_page: typeof hexo.config.per_page === 'undefined' ? 10 : hexo.config.per_page,
  order_by: '-date'
}, hexo.config.index_generator);

hexo.extend.generator.register('index', function(locals) {
  let covers = [];
  let catlist = [];
  let pages = [];
  locals.posts.data = locals.posts.data.sort(function(a, b) {
      if(a.top && b.top) { // 两篇文章top都有定义
          if(a.top == b.top) return b.date - a.date; // 若top值一样则按照文章日期降序排
          else return b.top - a.top; // 否则按照top值降序排
      }
      else if(a.top && !b.top) { // 以下是只有一篇文章top有定义，那么将有top的排在前面（这里用异或操作居然不行233）
          return -1;
      }
      else if(!a.top && b.top) {
          return 1;
      }
      else return b.date - a.date; // 都没定义按照文章日期降序排
  });
  const config = hexo.config;
  const theme = hexo.theme.config;
  const sticky = locals.posts.find({'sticky': true}).sort(config.index_generator.order_by);
  const posts = locals.posts.find({'sticky': {$exists: false}}).sort(config.index_generator.order_by);
  const paginationDir = config.pagination_dir || 'page';
  const path = config.index_generator.path || '';
  const categories = locals.categories;

  var getTopcat = function(cat) {
    if (cat.parent) {
      var pCat = categories.findOne({'_id': cat.parent})
      return getTopcat(pCat);
    } else {
      return cat
    }
  }

  if (categories && categories.length) {
    categories.forEach((cat) => {
      let cover = 'source/_posts/' + cat.slug + '/cover.jpg'

      if (fs.existsSync(cover)) {
        covers.push({
          path: cat.slug + '/cover.jpg',
          data: function () {
            return fs.createReadStream(cover)
          }
        });

        let topcat = getTopcat(cat)

        if (topcat._id != cat._id) {
          cat.top = topcat;
        }

        let child = categories.find({'parent': cat._id});
        let pl = 6;

        if (child.length != 0) {
          cat.child = child.length;
          cat.subs = child.sort({name: 1}).limit(6).toArray();
          pl = Math.max(0, pl - child.length)
          if(pl > 0) {
            cat.subs.push.apply(cat.subs, cat.posts.sort({title: 1}).filter(function(item, i) {
                                            if(item.categories.last()._id == cat._id)
                                              return true
                                          }).limit(pl).toArray());
          }
        } else {
          cat.subs = cat.posts.sort({title: 1}).limit(6).toArray();
        }

        catlist.push(cat)
      }
    });
  }

  if(posts.length > 0) {
    pages = pagination(path, posts, {
      perPage: config.index_generator.per_page,
      layout: ['index', 'archive'],
      format: paginationDir + '/%d/',
      data: {
        __index: true,
        catlist: catlist,
        sticky: sticky
      }
    });
  } else {
    pages = [{
        path,
        layout: ['index', 'archive'],
        data: {
          __index: true,
          catlist: catlist,
          sticky: sticky
        }
      }];
  }

  return [...covers, ...pages];

});
