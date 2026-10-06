import test from 'node:test'; import assert from 'node:assert/strict'; import {classify} from '../src/checker.js';
test('sold out wins even if cart button exists',()=>assert.equal(classify('<button>장바구니 담기</button><b>일시품절</b>').status,'soldout'));
test('cart button alone is unknown',()=>assert.equal(classify('<button>장바구니 담기</button><button>구매하기</button>').status,'unknown'));
test('explicit positive inventory is available',()=>assert.equal(classify('<div>재고 3개</div>').status,'available'));
test('http failure is unknown',()=>assert.equal(classify('재고 3개',403).status,'unknown'));

test('classifier reason never leaks regex internals',()=>assert.equal(classify('<b>품절</b>').reason,'명시적 품절 신호 확인'));
