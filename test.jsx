/* @jsxRuntime automatic @jsxImportSource react */
/**
 * @import {Root} from 'hast'
 * @import {ComponentProps, ReactNode} from 'react'
 * @import {ExtraProps} from 'react-markdown'
 * @import {Plugin} from 'unified'
 */

/**
 * @typedef DeferredPlugin
 *   Deferred plugin.
 * @property {Plugin<[]>} plugin
 *   Plugin.
 * @property {(error: Error) => undefined} reject
 *   Reject the plugin.
 * @property {() => undefined} resolve
 *   Resolve the plugin.
 */

import assert from 'node:assert/strict'
import test from 'node:test'
import 'global-jsdom/register'
import {render, waitFor} from '@testing-library/react'
import concatStream from 'concat-stream'
import {Component} from 'react'
import {renderToPipeableStream, renderToStaticMarkup} from 'react-dom/server'
import Markdown, {MarkdownAsync, MarkdownHooks} from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import rehypeStarryNight from 'rehype-starry-night'
import remarkGfm from 'remark-gfm'
import remarkToc from 'remark-toc'
import {visit} from 'unist-util-visit'

const decoder = new TextDecoder()

test('react-markdown (core)', async function (t) {
  await t.test('should expose the public api', async function () {
    assert.deepEqual(Object.keys(await import('react-markdown')).sort(), [
      'MarkdownAsync',
      'MarkdownHooks',
      'default',
      'defaultUrlTransform'
    ])
  })
})

test('Markdown', async function (t) {
  await t.test('should work', function () {
    assert.equal(renderToStaticMarkup(<Markdown children="a" />), '<p>a</p>')
  })

  await t.test('should throw w/ `source`', function () {
    assert.throws(function () {
      // @ts-expect-error: check how the runtime handles untyped `source`.
      renderToStaticMarkup(<Markdown source="a" />)
    }, /Unexpected `source` prop, use `children` instead/)
  })

  await t.test('should throw w/ non-string children (number)', function () {
    assert.throws(function () {
      // @ts-expect-error: check how the runtime handles invalid `children`.
      renderToStaticMarkup(<Markdown children={1} />)
    }, /Unexpected value `1` for `children` prop, expected `string`/)
  })

  await t.test('should throw w/ non-string children (boolean)', function () {
    assert.throws(function () {
      // @ts-expect-error: check how the runtime handles invalid `children`.
      renderToStaticMarkup(<Markdown children={true} />)
    }, /Unexpected value `true` for `children` prop, expected `string`/)
  })

  await t.test('should support `null` as children', function () {
    assert.equal(renderToStaticMarkup(<Markdown children={null} />), '')
  })

  await t.test('should support `undefined` as children', function () {
    assert.equal(renderToStaticMarkup(<Markdown children={undefined} />), '')
  })

  await t.test('should warn w/ `allowDangerousHtml`', function () {
    assert.throws(function () {
      // @ts-expect-error: check how the runtime handles deprecated `allowDangerousHtml`.
      renderToStaticMarkup(<Markdown allowDangerousHtml />)
    }, /Unexpected `allowDangerousHtml` prop, remove it/)
  })

  await t.test('should support a block quote', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="> a" />),
      '<blockquote>\n<p>a</p>\n</blockquote>'
    )
  })

  await t.test('should support a break', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children={'a\\\nb'} />),
      '<p>a<br/>\nb</p>'
    )
  })

  await t.test('should support a code (block, flow; indented)', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="    a" />),
      '<pre><code>a\n</code></pre>'
    )
  })

  await t.test('should support a code (block, flow; fenced)', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children={'```js\na\n```'} />),
      '<pre><code class="language-js">a\n</code></pre>'
    )
  })

  await t.test('should support a delete (GFM)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown children="~a~" remarkPlugins={[remarkGfm]} />
      ),
      '<p><del>a</del></p>'
    )
  })

  await t.test('should support an emphasis', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="*a*" />),
      '<p><em>a</em></p>'
    )
  })

  await t.test('should support a footnote (GFM)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown children={'a[^x]\n\n[^x]: y'} remarkPlugins={[remarkGfm]} />
      ),
      '<p>a<sup><a href="#user-content-fn-x" id="user-content-fnref-x" data-footnote-ref="true" aria-describedby="footnote-label">1</a></sup></p>\n<section data-footnotes="true" class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>\n<ol>\n<li id="user-content-fn-x">\n<p>y <a href="#user-content-fnref-x" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>\n</li>\n</ol>\n</section>'
    )
  })

  await t.test('should support a heading', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="# a" />),
      '<h1>a</h1>'
    )
  })

  await t.test('should support an html (default)', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="<i>a</i>" />),
      '<p>&lt;i&gt;a&lt;/i&gt;</p>'
    )
  })

  await t.test('should support an html (w/ `rehype-raw`)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown children="<i>a</i>" rehypePlugins={[rehypeRaw]} />
      ),
      '<p><i>a</i></p>'
    )
  })

  await t.test('should support an image', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="![a](b)" />),
      // Note: React weirdly adds `rel="preload"`.
      '<link rel="preload" as="image" href="b"/><p><img src="b" alt="a"/></p>'
    )
  })

  await t.test('should support an image w/ a title', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="![a](b (c))" />),
      // Note: React weirdly adds `rel="preload"`.
      '<link rel="preload" as="image" href="b"/><p><img src="b" alt="a" title="c"/></p>'
    )
  })

  await t.test('should support an image reference / definition', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children={'![a]\n\n[a]: b'} />),
      // Note: React weirdly adds `rel="preload"`.
      '<link rel="preload" as="image" href="b"/><p><img src="b" alt="a"/></p>'
    )
  })

  await t.test('should support code (text, inline)', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="`a`" />),
      '<p><code>a</code></p>'
    )
  })

  await t.test('should support a link', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[a](b)" />),
      '<p><a href="b">a</a></p>'
    )
  })

  await t.test('should support a link w/ a title', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[a](b (c))" />),
      '<p><a href="b" title="c">a</a></p>'
    )
  })

  await t.test('should support a link reference / definition', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children={'[a]\n\n[a]: b'} />),
      '<p><a href="b">a</a></p>'
    )
  })

  await t.test('should support prototype poluting identifiers', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={
            '[][__proto__] [][constructor]\n\n[__proto__]: a\n[constructor]: b'
          }
        />
      ),
      '<p><a href="a"></a> <a href="b"></a></p>'
    )
  })

  await t.test('should support duplicate definitions', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children={'[a][]\n\n[a]: b\n[a]: c'} />),
      '<p><a href="b">a</a></p>'
    )
  })

  await t.test('should support a list (unordered) / list item', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="* a" />),
      '<ul>\n<li>a</li>\n</ul>'
    )
  })

  await t.test('should support a list (ordered) / list item', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="1. a" />),
      '<ol>\n<li>a</li>\n</ol>'
    )
  })

  await t.test('should support a paragraph', function () {
    assert.equal(renderToStaticMarkup(<Markdown children="a" />), '<p>a</p>')
  })

  await t.test('should support a strong', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="**a**" />),
      '<p><strong>a</strong></p>'
    )
  })

  await t.test('should support a table (GFM)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'| a |\n| - |\n| b |'}
          remarkPlugins={[remarkGfm]}
        />
      ),
      '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'
    )
  })

  await t.test('should support a table (GFM; w/ align)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'| a | b | c | d |\n| :- | :-: | -: | - |'}
          remarkPlugins={[remarkGfm]}
        />
      ),
      '<table><thead><tr><th style="text-align:left">a</th><th style="text-align:center">b</th><th style="text-align:right">c</th><th>d</th></tr></thead></table>'
    )
  })

  await t.test('should support a thematic break', function () {
    assert.equal(renderToStaticMarkup(<Markdown children="***" />), '<hr/>')
  })

  await t.test('should support ab absolute path', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](/a)" />),
      '<p><a href="/a"></a></p>'
    )
  })

  await t.test('should support an absolute URL', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](http://a.com)" />),
      '<p><a href="http://a.com"></a></p>'
    )
  })

  await t.test('should support a URL w/ uppercase protocol', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](HTTPS://A.COM)" />),
      '<p><a href="HTTPS://A.COM"></a></p>'
    )
  })

  await t.test('should make a `javascript:` URL safe', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](javascript:alert(1))" />),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should make a `vbscript:` URL safe', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](vbscript:alert(1))" />),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should make a `VBSCRIPT:` URL safe', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](VBSCRIPT:alert(1))" />),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should make a `file:` URL safe', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](file:///etc/passwd)" />),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should allow an empty URL', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[]()" />),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should support search (`?`) in a URL', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](a?javascript:alert(1))" />),
      '<p><a href="a?javascript:alert(1)"></a></p>'
    )
  })

  await t.test('should support hash (`&`) in a URL', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](a?b&c=d)" />),
      '<p><a href="a?b&amp;c=d"></a></p>'
    )
  })

  await t.test('should support hash (`#`) in a URL', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="[](a#javascript:alert(1))" />),
      '<p><a href="a#javascript:alert(1)"></a></p>'
    )
  })

  await t.test('should support `urlTransform` (`href` on `a`)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="[a](https://b.com 'c')"
          urlTransform={function (url, key, node) {
            assert.equal(url, 'https://b.com')
            assert.equal(key, 'href')
            assert.equal(node.tagName, 'a')
            return ''
          }}
        />
      ),
      '<p><a href="" title="c">a</a></p>'
    )
  })

  await t.test('should support `urlTransform` w/ empty URLs', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="[]()"
          urlTransform={function (url, key, node) {
            assert.equal(url, '')
            assert.equal(key, 'href')
            assert.equal(node.tagName, 'a')
            return ''
          }}
        />
      ),
      '<p><a href=""></a></p>'
    )
  })

  await t.test('should support `urlTransform` (`src` on `img`)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="![a](https://b.com 'c')"
          urlTransform={function (url, key, node) {
            assert.equal(url, 'https://b.com')
            assert.equal(key, 'src')
            assert.equal(node.tagName, 'img')
            return null
          }}
        />
      ),
      '<p><img alt="a" title="c"/></p>'
    )
  })

  await t.test('should support `skipHtml`', function () {
    const actual = renderToStaticMarkup(
      <Markdown children="a<i>b</i>c" skipHtml />
    )
    assert.equal(actual, '<p>abc</p>')
  })

  await t.test(
    'should support `allowedElements` (drop unlisted nodes)',
    function () {
      assert.equal(
        renderToStaticMarkup(
          <Markdown
            children={'# *a*\n* b'}
            allowedElements={['h1', 'li', 'ul']}
          />
        ),
        '<h1></h1>\n<ul>\n<li>b</li>\n</ul>'
      )
    }
  )

  await t.test('should support `allowedElements` as a function', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="*a* **b**"
          allowElement={function (element) {
            return element.tagName !== 'em'
          }}
        />
      ),
      '<p> <strong>b</strong></p>'
    )
  })
  await t.test('should support `disallowedElements`', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown children={'# *a*\n* b'} disallowedElements={['em']} />
      ),
      '<h1></h1>\n<ul>\n<li>b</li>\n</ul>'
    )
  })

  await t.test(
    'should fail for both `allowedElements` and `disallowedElements`',
    function () {
      assert.throws(function () {
        renderToStaticMarkup(
          <Markdown
            children=""
            allowedElements={['p']}
            disallowedElements={['a']}
          />
        )
      }, /Unexpected combined `allowedElements` and `disallowedElements`, expected one or the other/)
    }
  )

  await t.test(
    'should support `unwrapDisallowed` w/ `allowedElements`',
    function () {
      assert.equal(
        renderToStaticMarkup(
          <Markdown
            children="# *a*"
            unwrapDisallowed
            allowedElements={['h1']}
          />
        ),
        '<h1>a</h1>'
      )
    }
  )

  await t.test(
    'should support `unwrapDisallowed` w/ `disallowedElements`',
    function () {
      assert.equal(
        renderToStaticMarkup(
          <Markdown
            children="# *a*"
            unwrapDisallowed
            disallowedElements={['em']}
          />
        ),
        '<h1>a</h1>'
      )
    }
  )

  await t.test('should support `remarkRehypeOptions`', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'[^x]\n\n[^x]: a\n\n'}
          remarkPlugins={[remarkGfm]}
          remarkRehypeOptions={{clobberPrefix: 'b-'}}
        />
      ),
      '<p><sup><a href="#b-fn-x" id="b-fnref-x" data-footnote-ref="true" aria-describedby="footnote-label">1</a></sup></p>\n<section data-footnotes="true" class="footnotes"><h2 class="sr-only" id="footnote-label">Footnotes</h2>\n<ol>\n<li id="b-fn-x">\n<p>a <a href="#b-fnref-x" data-footnote-backref="" aria-label="Back to reference 1" class="data-footnote-backref">↩</a></p>\n</li>\n</ol>\n</section>'
    )
  })

  await t.test('should support `components`', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="# a" components={{h1: 'h2'}} />),
      '<h2>a</h2>'
    )
  })

  await t.test('should support `components` as functions', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="a"
          components={{
            p(props) {
              const {node, ...rest} = props
              assert.deepEqual(rest, {children: 'a'})
              return <div {...rest} />
            }
          }}
        />
      ),
      '<div>a</div>'
    )
  })

  await t.test('should fail on an invalid component', function () {
    assert.throws(function () {
      renderToStaticMarkup(
        <Markdown
          children="# a"
          components={{
            // @ts-expect-error: check how the runtime handles an invalid component.
            h1: 123
          }}
        />
      )
    }, /Element type is invalid/)
  })

  await t.test('should support `components` (headings)', function () {
    let calls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'# a\n## b'}
          components={{h1: heading, h2: heading}}
        />
      ),
      '<h1>a</h1>\n<h2>b</h2>'
    )

    assert.equal(calls, 2)

    /**
     * @param {ComponentProps<'h1'> & ExtraProps} props
     */
    function heading(props) {
      const {node, ...rest} = props
      assert(node)
      assert(node.tagName === 'h1' || node.tagName === 'h2')
      calls++
      return <node.tagName {...rest} />
    }
  })

  await t.test('should support `components` (code)', function () {
    let calls = 0
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'```\na\n```\n\n\tb\n\n`c`'}
          components={{
            code(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'code')
              calls++
              return <code {...rest} />
            }
          }}
        />
      ),
      '<pre><code>a\n</code></pre>\n<pre><code>b\n</code></pre>\n<p><code>c</code></p>'
    )

    assert.equal(calls, 3)
  })

  await t.test('should support `components` (li)', function () {
    let calls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'* [x] a\n1. b'}
          components={{
            li(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'li')
              calls++
              return <li {...rest} />
            }
          }}
          remarkPlugins={[remarkGfm]}
        />
      ),
      '<ul class="contains-task-list">\n<li class="task-list-item"><input type="checkbox" disabled="" checked=""/> a</li>\n</ul>\n<ol>\n<li>b</li>\n</ol>'
    )

    assert.equal(calls, 2)
  })

  await t.test('should support `components` (ol)', function () {
    let calls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="1. a"
          components={{
            ol(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'ol')
              calls++
              return <ol {...rest} />
            }
          }}
        />
      ),
      '<ol>\n<li>a</li>\n</ol>'
    )

    assert.equal(calls, 1)
  })

  await t.test('should support `components` (ul)', function () {
    let calls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="* a"
          components={{
            ul(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'ul')
              calls++
              return <ul {...rest} />
            }
          }}
        />
      ),
      '<ul>\n<li>a</li>\n</ul>'
    )

    assert.equal(calls, 1)
  })

  await t.test('should support `components` (tr)', function () {
    let calls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'|a|\n|-|\n|b|'}
          components={{
            tr(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'tr')
              calls++
              return <tr {...rest} />
            }
          }}
          remarkPlugins={[remarkGfm]}
        />
      ),
      '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'
    )

    assert.equal(calls, 2)
  })

  await t.test('should support `components` (td, th)', function () {
    let tdCalls = 0
    let thCalls = 0

    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'|a|\n|-|\n|b|'}
          components={{
            td(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'td')
              tdCalls++
              return <td {...rest} />
            },
            th(props) {
              const {node, ...rest} = props
              assert(node)
              assert(node.tagName === 'th')
              thCalls++
              return <th {...rest} />
            }
          }}
          remarkPlugins={[remarkGfm]}
        />
      ),
      '<table><thead><tr><th>a</th></tr></thead><tbody><tr><td>b</td></tr></tbody></table>'
    )

    assert.equal(tdCalls, 1)
    assert.equal(thCalls, 1)
  })

  await t.test('should pass `node` to components', function () {
    let calls = 0
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children="*a*"
          components={{
            em(props) {
              const {node, ...rest} = props
              assert.deepEqual(node, {
                type: 'element',
                tagName: 'em',
                properties: {},
                children: [
                  {
                    type: 'text',
                    value: 'a',
                    position: {
                      start: {line: 1, column: 2, offset: 1},
                      end: {line: 1, column: 3, offset: 2}
                    }
                  }
                ],
                position: {
                  start: {line: 1, column: 1, offset: 0},
                  end: {line: 1, column: 4, offset: 3}
                }
              })
              calls++
              return <em {...rest} />
            }
          }}
        />
      ),
      '<p><em>a</em></p>'
    )

    assert.equal(calls, 1)
  })

  await t.test('should support plugins (`remark-gfm`)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown children="a ~b~ c" remarkPlugins={[remarkGfm]} />
      ),
      '<p>a <del>b</del> c</p>'
    )
  })

  await t.test('should support plugins (`remark-toc`)', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'# a\n## Contents\n## b\n### c\n## d'}
          remarkPlugins={[remarkToc]}
        />
      ),
      `<h1>a</h1>
<h2>Contents</h2>
<ul>
<li><a href="#b">b</a>
<ul>
<li><a href="#c">c</a></li>
</ul>
</li>
<li><a href="#d">d</a></li>
</ul>
<h2>b</h2>
<h3>c</h3>
<h2>d</h2>`
    )
  })

  await t.test('should support aria properties', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="c" rehypePlugins={[plugin]} />),
      '<input id="a" aria-describedby="b" required=""/><p>c</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'input',
          properties: {id: 'a', ariaDescribedBy: 'b', required: true},
          children: []
        })
      }
    }
  })

  await t.test('should support data properties', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="b" rehypePlugins={[plugin]} />),
      '<i data-whatever="a"></i><p>b</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'i',
          properties: {dataWhatever: 'a', dataIgnoreThis: undefined},
          children: []
        })
      }
    }
  })

  await t.test('should support comma separated properties', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="c" rehypePlugins={[plugin]} />),
      '<i accept="a, b"></i><p>c</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'i',
          properties: {accept: ['a', 'b']},
          children: []
        })
      }
    }
  })

  await t.test('should support `style` properties', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="a" rehypePlugins={[plugin]} />),
      '<i style="color:red;font-weight:bold"></i><p>a</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'i',
          properties: {style: 'color: red; font-weight: bold'},
          children: []
        })
      }
    }
  })

  await t.test(
    'should support `style` properties w/ vendor prefixes',
    function () {
      assert.equal(
        renderToStaticMarkup(
          <Markdown children="a" rehypePlugins={[plugin]} />
        ),
        '<i style="-ms-b:1;-webkit-c:2"></i><p>a</p>'
      )

      function plugin() {
        /**
         * @param {Root} tree
         * @returns {undefined}
         */
        return function (tree) {
          tree.children.unshift({
            type: 'element',
            tagName: 'i',
            properties: {style: '-ms-b: 1; -webkit-c: 2'},
            children: []
          })
        }
      }
    }
  )

  await t.test('should support broken `style` properties', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="a" rehypePlugins={[plugin]} />),
      '<i></i><p>a</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'i',
          properties: {style: 'broken'},
          children: []
        })
      }
    }
  })

  await t.test('should support SVG elements', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="a" rehypePlugins={[plugin]} />),
      '<svg viewBox="0 0 500 500" xmlns="http://www.w3.org/2000/svg"><title>SVG `&lt;circle&gt;` element</title><circle cx="120" cy="120" r="100"></circle><path stroke-miterlimit="-1"></path></svg><p>a</p>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({
          type: 'element',
          tagName: 'svg',
          properties: {
            viewBox: '0 0 500 500',
            xmlns: 'http://www.w3.org/2000/svg'
          },
          children: [
            {
              type: 'element',
              tagName: 'title',
              properties: {},
              children: [{type: 'text', value: 'SVG `<circle>` element'}]
            },
            {
              type: 'element',
              tagName: 'circle',
              properties: {cx: 120, cy: 120, r: 100},
              children: []
            },
            // `strokeMiterLimit` in hast, `strokeMiterlimit` in React.
            {
              type: 'element',
              tagName: 'path',
              properties: {strokeMiterLimit: -1},
              children: []
            }
          ]
        })
      }
    }
  })

  await t.test('should support comments (ignore them)', function () {
    const input = 'a'
    const actual = renderToStaticMarkup(
      <Markdown children={input} rehypePlugins={[plugin]} />
    )
    const expected = '<p>a</p>'
    assert.equal(actual, expected)

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        tree.children.unshift({type: 'comment', value: 'things!'})
      }
    }
  })

  await t.test('should support table cells w/ style', function () {
    assert.equal(
      renderToStaticMarkup(
        <Markdown
          children={'| a  |\n| :- |'}
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[plugin]}
        />
      ),
      '<table><thead><tr><th style="color:red;text-align:left">a</th></tr></thead></table>'
    )

    function plugin() {
      /**
       * @param {Root} tree
       * @returns {undefined}
       */
      return function (tree) {
        visit(tree, 'element', function (node) {
          if (node.tagName === 'th') {
            node.properties = {...node.properties, style: 'color: red'}
          }
        })
      }
    }
  })

  await t.test('should not fail on a plugin replacing `root`', function () {
    assert.equal(
      renderToStaticMarkup(<Markdown children="a" rehypePlugins={[plugin]} />),
      ''
    )

    function plugin() {
      /**
       * @returns {Root}
       */
      return function () {
        // @ts-expect-error: check how non-roots are handled.
        return {type: 'comment', value: 'things!'}
      }
    }
  })
})

test('MarkdownAsync', async function (t) {
  await t.test('should support `MarkdownAsync` (1)', async function () {
    assert.throws(function () {
      renderToStaticMarkup(<MarkdownAsync children={'a'} />)
    }, /A component suspended while responding to synchronous input/)
  })

  await t.test('should support `MarkdownAsync` (2)', async function () {
    return new Promise(function (resolve, reject) {
      renderToPipeableStream(<MarkdownAsync children={'a'} />)
        .pipe(
          concatStream({encoding: 'u8'}, function (data) {
            assert.equal(decoder.decode(data), '<p>a</p>')
            resolve()
          })
        )
        .on('error', reject)
    })
  })

  await t.test(
    'should support async plugins w/ `MarkdownAsync` (`rehype-starry-night`)',
    async function () {
      return new Promise(function (resolve) {
        renderToPipeableStream(
          <MarkdownAsync
            children={'```js\nconsole.log(3.14)'}
            rehypePlugins={[rehypeStarryNight]}
          />
        ).pipe(
          concatStream({encoding: 'u8'}, function (data) {
            assert.equal(
              decoder.decode(data),
              '<pre><code class="language-js"><span class="pl-en">console</span>.<span class="pl-c1">log</span>(<span class="pl-c1">3.14</span>)\n</code></pre>'
            )
            resolve()
          })
        )
      })
    }
  )
})

// Note: hooks are not supported on the “server”.
test('MarkdownHooks', async function (t) {
  await t.test('should support `MarkdownHooks`', async function () {
    const plugin = deferPlugin()
    const result = render(
      <MarkdownHooks children={'a'} rehypePlugins={[plugin.plugin]} />
    )

    assert.equal(result.container.innerHTML, '')

    plugin.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, '')
    })

    assert.equal(result.container.innerHTML, '<p>a</p>')
  })

  await t.test(
    'should support async plugins w/ `MarkdownHooks` (`rehype-starry-night`)',
    async function () {
      const plugin = deferPlugin()
      const result = render(
        <MarkdownHooks
          children={'```js\nconsole.log(3.14)'}
          rehypePlugins={[plugin.plugin, rehypeStarryNight]}
        />
      )

      assert.equal(result.container.innerHTML, '')

      plugin.resolve()

      await waitFor(function () {
        assert.notEqual(result.container.innerHTML, '')
      })

      assert.equal(
        result.container.innerHTML,
        '<pre><code class="language-js"><span class="pl-en">console</span>.<span class="pl-c1">log</span>(<span class="pl-c1">3.14</span>)\n</code></pre>'
      )
    }
  )

  await t.test('should support `fallback`', async function () {
    const plugin = deferPlugin()
    const result = render(
      <MarkdownHooks
        children={'a'}
        fallback="Loading"
        rehypePlugins={[plugin.plugin]}
      />
    )

    assert.equal(result.container.innerHTML, 'Loading')

    plugin.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, 'Loading')
    })

    assert.equal(result.container.innerHTML, '<p>a</p>')
  })

  await t.test('should support `onComplete`', async function () {
    const plugin = deferPlugin()
    let succes = false
    render(
      <MarkdownHooks
        children={'a'}
        onComplete={function () {
          succes = true
        }}
        rehypePlugins={[plugin.plugin]}
      />
    )

    assert.equal(succes, false)

    plugin.resolve()

    await waitFor(function () {
      assert.notEqual(succes, false)
    })

    assert.equal(succes, true)
  })

  await t.test('should support plugins that error', async function () {
    const plugin = deferPlugin()
    const result = render(
      <ErrorBoundary>
        <MarkdownHooks children={'a'} rehypePlugins={[plugin.plugin]} />
      </ErrorBoundary>
    )

    assert.equal(result.container.innerHTML, '')

    console.info('\nNote: the below error (`Error: rejected`) is expected.\n')

    plugin.reject(new Error('rejected'))

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, '')
    })

    console.info('Note: the above error (`Error: rejected`) was expected.')

    assert.equal(result.container.innerHTML, 'Error: rejected')
  })

  await t.test('should support rerenders', async function () {
    const pluginA = deferPlugin()
    const pluginB = deferPlugin()

    const result = render(
      <MarkdownHooks children={'a'} rehypePlugins={[pluginA.plugin]} />
    )

    assert.equal(result.container.innerHTML, '')

    result.rerender(
      <MarkdownHooks children={'b'} rehypePlugins={[pluginB.plugin]} />
    )

    assert.equal(result.container.innerHTML, '')

    pluginA.resolve()
    pluginB.resolve()

    await waitFor(function () {
      assert.notEqual(result.container.innerHTML, '')
    })

    assert.equal(result.container.innerHTML, '<p>b</p>')
  })
})

/**
 * Create an async unified plugin that waits until a promise is resolved or
 * rejected from the outside.
 *
 * @returns {DeferredPlugin}
 *   Deferred plugin object.
 */
function deferPlugin() {
  /** @type {(error: Error) => void} */
  let hoistedReject
  /** @type {() => void} */
  let hoistedResolve
  /** @type {Promise<void>} */
  const promise = new Promise(function (resolve, reject) {
    hoistedResolve = resolve
    hoistedReject = reject
  })

  return {
    plugin() {
      return function () {
        return promise
      }
    },
    reject(error) {
      hoistedReject(error)
    },
    resolve() {
      hoistedResolve()
    }
  }
}

/**
 * Basic error boundary.
 */
class ErrorBoundary extends Component {
  /**
   * @param {Error} error
   *   Error.
   * @returns {undefined}
   *   Nothing.
   */
  componentDidCatch(error) {
    this.setState({error})
  }

  render() {
    const props = /** @type {{children: ReactNode}} */ (this.props)

    return this.state.error ? String(this.state.error) : props.children
  }

  state = {
    /**
     * @type {Error | undefined}
     *   Error.
     */
    error: undefined
  }
}
