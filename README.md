# gulp-convert-css-var
获取css的变量的具体值，并在变量的上一行加上一行写入了具体值的规则，用于兼容不支持css变量的浏览器

# 安装

从[npm](https://www.npmjs.com/package/gulp-convert-css-var)安装

```
npm install gulp-convert-css-var --save-dev
```

## 简单的例子
```js
var gulp = require('gulp');
var convert  = require('gulp-cat');

gulp.task('default', function() {
    return gulp.src('./test.css')
        .pipe(convert());
});
```

假设`test.css`的内容为：
```css
:root {
	--BG-0: #ededed;
	--FG-0: rgba(0, 0, 0, .9)
}

.example {
	margin-top: 20px;
	color: var(--FG-0);
	background: var(--BG-0);
}

.example .test {
	margin: 10px
}
```

会转化为：
```css
:root {
  --BG-0: #ededed;
  --FG-0: rgba(0, 0, 0, .9);
}

.example {
  margin-top: 20px;
  color: rgba(0, 0, 0, .9);
  color: var(--FG-0);
  background: #ededed;
  background: var(--BG-0);
}

.example .test {
  margin: 10px;
}
```