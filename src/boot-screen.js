// Pre-boot screen, injected as a parser-blocking head row by entry.js.
//
// This file is a script *text*, not a module: it runs before the shell module
// script and therefore before `AppWebEntry` builds the kernel boot page. That
// ordering is the entire mechanism: by the time the kernel renders its own
// "HARNESS / Loading plugins..." page, this screen already owns the viewport.
//
// It reads the clip pool and hold budget from the JSON row emitted immediately
// before this script (window.__DSH_BOOT_ANIM_CFG__), and it reads live boot
// progress by observing the CSS custom property the kernel boot page writes on
// its spinner (`--dsh-boot-arc`: 72deg at zero active entries, 288deg at all).
//
// It deliberately does not touch React or the shell module table: it needs no
// framework and must survive the UI renderer failing.
//
// One further entry exists for the settings card: `namespace.preview({ name, ... })`
// re-runs this same overlay on demand, for one named clip, so a clip can be judged
// as the boot animation without restarting DSH. It rebuilds the DOM from the
// settings the card currently shows and resets the run state; the boot path itself
// is untouched, because it has already finished by the time that button is reachable.

/* eslint-disable */
;(function () {
  'use strict'

  // ============================================================
  // 定制区：改这里就行（改完需要完整重启 DSH）
  // ============================================================
  // 时段问候
  function greetingPrefix() {
    var h = new Date().getHours()
    if (h < 5) return '凌晨了还没睡 · '
    if (h < 11) return '早上好 · '
    if (h < 13) return '中午好 · '
    if (h < 18) return '下午好 · '
    return '晚上好 · '
  }
  var BRAND_TITLE = greetingPrefix() + 'DeepSeek Harness'
  var WELCOME_LEAD_S = 3.0
  var ENTER_AFTER_WELCOME_MS = 120
  var WELCOME_VOLUME = 0.45
  var welcomeHook = null
  var welcomeCleanup = null
  var WELCOME_SRC = 'data:audio/mpeg;base64,SUQzBAAAAAAAIlRTU0UAAAAOAAADTGF2ZjYxLjcuMTAwAAAAAAAAAAAAAAD/+5TAAAAAAAAAAAAAAAAAAAAAAABJbmZvAAAADwAAADoAAFiAAAgNDRERFRoaHh4iIicrKy8vNDg4PDxBQUVJSU5OUlJWW1tfX2NoaGxscHB1eXl9fYKGhoqKj4+Tl5ecnKCgpKmpra2xtra6ur6+w8fHy8vQ0NTY2N3d4eXl6uru7vL39/v7/wAAAABMYXZjNjEuMTkAAAAAAAAAAAAAAAAkAwUAAAAAAABYgM2ACOwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD/+5TEAAAR/SsKJ7DN2oG1IimGDngA0PQ9Dy3lzNM01HHUg3BDDgXY9YAYEx3MBAEQSBEJhg5NnG/bMzM/fpRYYEgwPFiwnmZmZv3XmZmJAkEwwEgSBIEgmH4DAYDJkyZMmQIIQYQIEEE7PJkyd3cRERERG97u7u8/iP/F3d/3fj+I///93t3cQYQgAAA8PDw9IAOwcf/h4YAAAAAHvn/AwA/zx8g/wCEAqNMSaLUL9oSmtKpEUxozWE9A5IQgPALMbRBxkj/Ps0tcbv5Q2hrkw8oCIKSKWWFq5cZGSqO8BWbhcclssumKtUvK0a+7xVWJz55WuVJ1WFla4cSdk0fRKgQkJMVi8dLjExUnqV11lmB61vy0Hnu0fOaw+0jR0BOHpYylShGfKGGPMlVSrNPOGd1////wA95evK3D57i14FL4eDFC1XhQhShft42GBAIzAAhLCQUdOsYEFGNlZkYoYwbmJqR+JUZiFmBgCfIOMhQMCCxd6cDks7PNSnIg1xD/+5TEHQAYyakGzb0zgoWyIvG2CvAuJMZKjYG9/FRM9VOiCVYUxkmTKrUJa4E8N8TFD5oj9c1jRozZJqmJaRtq5emLHhRm/FTr+6hU7Co2e2lSobJXREFtBcSIBQhQkeAIooQADbuDm91YjZQqQSiVllycx4KpFVUmHub2//dy/+1dRvx/z+dztKb5B8zW8KAmgIa8EiH2UXamkt/aX5USBgSGAABbt/EsfQCh5kpmWbbVdoKFxkkAIEtkwAHBgUatgG3QRYEQ4jRNoIML8TjEHImKSklN1xmcSF/n7Y+/Uq82k4dCYEhwPLQxBuU2jg/gUUYX6wYZa9WqL0I8XMc4ilOlOnD1tpyYT9t36YzM3xCWYer2Nuf2buwgWOM7pvBVI3VjK5ekXt/nycDiBbnfs/d+ibr//dMgRrhTN0vQQym8ulqOMpkAhKMhYwICm5mMAU2hg4PmWR6Y5I5rQKn7UeZgiZiMWEpADCwYRG4yByYfgVA6QsQ4kzGUJODXP1v/+5TEHoHaDakMDj0xwpWlo1XHsirE3ckyY9VI83iOp4gtJP29mQw7jhVF0QaapMthPxoYT+HGqc3njySKRNXeugvwGs0lQ1PWs5zGO1PHIYh1RFhJVjtdkpZAjH0ZNxCzZIGyQLi7BITBkvoUChQD5ClsnI2rZtHrtdUyshgMrH2JM+K8//WX/9yshO5z28v/10UYVI5KZCWDLUcdUW6QV0GH5/v+W2PINHUdDgBWIgUyYCAYwQEjCABQTluDPiCMJ0c/PQQoUTOZ1FiUYKCAgCRMEYSAjikEkMMyzLbRxmGu2xKJZghrsy1uR+zUXUZb0jonZ2qVabHpG1lFquPzQc2K5FEcLIkp2W0CATnmC6DBomFhCQudZfbfo5PwZaK9FjCy9ufgfXy6jjvrO+801eZ3ocaqvc72/bKbTmRX+YX1fT9LjwfYDTnOpa6moQAAAJRISUaaRbh/FDHMZ8tCHk5A4PMGNiErAOScujmUBQJCjEBBGha7LUr2nQttZ9//+5TEGQAXJUstrbH1wxAqJaHHl5lYPzdmHojBaYmaIeSqLzMllxxxt0/KZ/G6VyWuSF0SzoDEDj6RCZec39O17Nkq8fjASB6CUeQZkgqkdQZggVx0U22HTOywvg3DsA6NDVoYCwMCAY2gMAnHcuGS1Tig/scKGjxPH2xpzMiaw9Y0ijx8IlTuKnZ4zyP/9/P/xAZ48YAof70pWORCAAAES5hEMo2PqmqneSAIcBwiEBkYUGL46aVMZmhqGPAMAi+DBSjKhwMDhFCKMqGQ6iWuSTP+qpHIjg2KrjXfubm5+ZqXXbdSXvXB8sfR92tWWZpcUNoMC8Qs3aRrjB2s+2Ndo9HpFtkTzmcAgitJgSshYA7T49QLsBjD0DES7WF+gpoCwn9wIaZF4xhAkILY8OhdXJ0KwG+ehum2zhhmgjGR3EZ2fe1QjJULduDAWxNZ0xi5BSPDwdDrhBv/0Bxc6jXH1YSAAAAALKOypVZej9KWxZFpohhoOtOBcOgDBWk0QhD/+5TED4HW2VU5bGnqQqgqJ9GnnrmWRKjGHgJkKQhRiG4g1Q7Ux0PF5CWJkorMyk7hqQ0Doay8Mi2xx1SVT0/zTT5vHipnsjtygwJlwfC9bFNNZXmOOgR8fz9NlsFxVZdSFh2so5S9rT/NjvVUVgY3JUvSXsBeHlMkzPlcMx2sxLGFXNjMhbOtOD1Fv1WebWppHhdDfibmhxn8iILYVrqryD//////8PNT5eblnrAAyqNFgeCVDgYAKAI4BJkpIpN0bPqUN+ZAjoz48oWNSCgBDo8Jd1eSsDlPxE8rVDCa0O3m7PElbYa7ZnJHK2yisu3Ai07ZQkvQp4PArGJZbkthotEe+kTbDI/cDRTpv2PIWcWZEmgkbIcrpIMe9ks8hN9nJkgvKNbm8IIzIYACyYMDaGrON4p3J4khaIbMOYsKcYTmZ15tmtvVFFIUCIRAYMETf9/51SNV6IAAAAAAAAr0IMQwqq9q70DwhNHwWOCzhtzmSgJxQUZGVBcHFRFC9Vf/+5TEFIGXvR9BrO3qwqek6T22PigEAbKllO85cTbmE5C4Hgq1Ih8F9RQuScmeQdqWDNBQ6x8ljSRiDnO1LBcGOiROUsdciM1HtAvG7zSEHKTsDcNQJWOgxlUHyF2q1MW0th5DkLnHjyxDnNIv8FdPJqwEC3D0IeqzsXhgLpShUBIiGmImbmSS0T8DaOZfymUkrlpTqBRxi+KBDoLxehkFDhv/jCj3w5XJ0UIgAAAcsjKM1g4HUpQZGhp3FVlnCwGJExhSsc52mJIwYmKDoiL/gwBhVHZKSkp0IyZorx5Kw79w9O17Z+VDo1H4nnpjXoBSMh7BmtPh6JHvqVymgeXnI/RyGEkMAgsEnCfVTifSpaVYWw4FZWV+56dxtOoMKdtXpEMioWSpRK97dqURKy4M58n25q0W1PnVh4qUu6wsOG9d69T0zxujvmTMgAd/UJO1Coyh5AAAAAAAGlU1KGGorEUMCoOaGRiQ2XZBACBCIyQNMxDza5oy83MhKh0tCBf/+5TEFgGYoStFjeHxwqwlqWWdPYo0kZMVD4Qq+22V3Ws1oMZG7DtyGKxaTcaxENwBDMQqReIX1DE1JG16LOO9DTmtM4X6y9htM90UrVYpAkC9uP/IoBgdzmviVhQThIqMet1Ik4Pu44rhVH/jym9p3V3FexVhDY8RblPQSRagqpLXRIrq5JQSohR5D3OxeB5CAoEvlkuui6FwOubwm3XgKol51E7DnlYTzmjt/4yAAApgwy2PhR44jhIwlZMC1UAUaSTMM42BwS6FDhpGY2scOMcAsaEWIwwmQqy3XjyKdx2n4TyhzwcWw0Ll4uUNWVhUJknqGIIWg+y/FiEYDNOga5oRAV6MS0R8pCfluaDTMgZgxztDUqkhD5U4iLpHIdZDVypFP6QI1rxfmej3/Ol0h2/j6XfVB3rRYWaATkgRhG5CyZy2uosDX/+bV5zND3cdIV3P/0amEeqAAAABYC2pgQKmNoaYiCpc4weHzX64IhMIwiYyNRn0GDw3UiYtFKD/+5TEE4GXjS1DDmXtwtOmKBnMPfAMvANfiMwbKJm1MRpq+5MDQHd+B6eDqW9fpaS7B0G3L1/4FcpuyLS7WzLRgKmgxBthCOa1hppPFl7K2W08qNRT/pqecYRjIklIkpiop8jnhpTvn071GvHr148n/8ssnk7/vvO+JW+emCSkTEPJomgAPSGBajbAHUpLyUDGIcKSjJ5jA8s6YRk5LUaYrx5LpEP2b/gDqZAAVZnJYABk5fCwTeQwUGziwZBQUEAUCz6DjsBACFxGY/IifSpSoOTORcQ0YK2e6VKyvdnM8o/qS6tQzdNGuQLGKsqZpZoIMnZbTM4lrxLJZ08FZPpKJ80QCJDq3mBxjPOzpdmQidhN9CjiLazRXcn+ZPM9n/knln//z+xPH7CrTeOJiJybpuTq0byFIQjBPBLCBjVQYnhunwmohuo4lSuOIuRNC2ooMxWnhAP+Oy9yjzf/KeQVoAAAAIAAG11QJnp64ZMUSPCmI4TFjAACGi6AOPAsFrH/+5TEEADWOT1DjW3pAsom6FG8PZjAYaiRBpASqwLpdUhD1yyxVNTHGpEu/UkjhWdTvOxI6O6bm5xQtChxJt8P9FvmdC0SmRxGmW9EArT+Qs/n0ViVkqNmF0YII0D+Sho9l1L5v/5P55/5//5X75+wM6tOMDULYjjwZnh+ub5+rIKbgREIQg/2pCUYP12zog/4ZoCljjN4IYhBN2x5P33a////P8wnowAAAADMmIv2bQCkwGghAKcGfcrAgeaDgg55HQItcaCKrDVBh6zX9mmwQ+yVKkBZVIuwKBc43Wnn0cBiIQoC+GxtZX21RHAQXRO1AVhVljOALKxvgSJvNgVA2aK1d1W25dN6tMpDHNws2ODc3ttt3/t///nf3/n0UFmrSsb0G7UJVkwQQdTWa5uNdlwfBknotJ4hQv0GNUOo1lFV0rRDwPJOlaHWbpvMdvn2at/Dd3pmNHrVoQAAAAAAAAjM4NaybKXI5PuhsemFp9ImG0I4OGy1ojWazRGGF+H/+5TEEwHWOTdDreHrQs+oqBG8vWgzYefiZ32PMljrVC+inKc5Zc2lalkyYkita9uauw3p5fW25cnIuB6CeDgWnRZG4ZXFmFya9t7eTwzGmqynFeu6m8ulndXG+N/41/ulcf4t8VanGyy4q9cocEyfRJU4AmGSXuygT9U626JIvKFcm0F6uiwk+Q5zJwWAhJvE5JYb21a6///vf5akgwdRrYgApsFzHEHLhBQGJD09kOh9W41lofB3iSly3JoBCM5naSD5VOUMGPs+CrkekwmgkQ7QVFBsQvEYjMdtjPoc8qON4/Ql59NYuxbz5YR8k1LckE2wpmV+1ISijRZEz2A0nStZWt2+k8//83/ne5w+kn7Cr0WmzTZ0eeB5CQkHRA4xPhCjfDDamE7TdYSZmkBrH9KefBVH+HeUpKAaTM1IgGWXMnY+R9opFsjz/+Sd55n0/mZvIoCCAAA5CpCwAnTnisbTgIHibE0xaBkiSy2Vkr6CLXWMye9av8rTtzLKNP//+5TEFYCUSSVCjeHrSmElaPGzPdBL2GK+RNKJB91p2kxn3kWVWswJnxJ3h6A+EY0qZoUmm9vnkpEb24312wmun29kVjkvOqUvCc4O/6/GvWsS8XedTxJ4rwuBZItQjTEhZh3hyToWqiv20NskU/VCYrKnm5QJSG3nHVRl6SSpVyxEJOxuTJD3HOg+/HAigNIAEtxC9IwNRCIBXMYMiA6GpkvgSHYwgRBtqPvVEhxEs6Tm1kp8OEqmIT4n6nOgpnz9SvVxBQ1iaxcB8FgJK6SDK+fNipdwsM7kXWEnWJgQxVOLK8vAkextb3N//8a/l/tP/FtAq8dsawhpdwYLgFm/ULOabNDXD5egsZbjufPIqSRUBrYH7U+swwb6bmZbhs3j3Df+usACCABv0VUfjz19C5Yhha0kVTpCDxqs12kvEm0iQOi6IkbnyiNRBHX7xRRMyqYuJTIQoS3Ufow+B/g8QJZvU6mLieaTNA0ka9T7LEYYirNZ8irTuUm6szFAvNn/+5TELYLS/SNFDaXtAmCqaGG2L2C26a////9cf73Pe0L4QxlcmEI7dPnqyrpAqSimhLiKYpoECbE42QVtPtp2tUjNhRsCExZD8eFAkGaU6JcmBqcojBgoSm+YhfF5AUNkwyp8hDEpXHckskwazPw5AVJGeT1i3T6r/Z//ms+SVyXeiSmyZlE0l+4IbWGlSo+jQS3OVi4e0hoeCSfrQyXJBCFcN6zeLZbpZ5i1J+35O1/dpOdsz19+0a8ejQf4U4hj2JaYTia2aFJ56g/FEBMZ0ikrltOiscu5ZOGkSol7uH/XUu6jf+5zKUuAAAQAXkKgogRjuL8MAGHmCFbD4eKgYVhcMu8Aglfjtsxd6MPZlWq19fGvo92McLN/6tmVXGYJ1I+0YOCWnqLQCWlW2zR+IHNYyQVyskOy6HEJoP5LNVpkdUj/eerKxVTLW/e6kz+ZOTnT99nljKt1a0+BJsSENiJ98zPFLFUg8CwxKnM6UyidPFtyTSKZNvkXDrX4/3r/+5TESwDTrTFDDbH6ylmpqKHMvGBnXG4jcrIE2AAhJbFYCMGg8fVxN0wQEZP9PkCiV0bh4rJY+vpA8k6713mrTpp9iW+pLR9v97dIALURkHQmHgDEW47EEz6gxZWaedIPqQWdjbVqzlAapt2h/0pWBrzZ+///94/x/bfpdsSaXW0aq00Tk1h9k/Mp8kXcGsRCFahCciNLBbDI8iwFVBmhxHGJV5LePvxIOsPL0+////IRpgQAAuUZABBLnJVSAl/zJy9zMgqGInr+ZiPDTAYyr2Ar0T1U1zl2d1u7rLWV3euRjFTl8DCQlVQFA7NgaAKRsRyTy6jW0qw4pNy2SQCqCzU6VPVo7//OP42zD3f8/PZ22z5vT4pmCiqtTInFU5hlJxDA8vYTjHf5xHMZOKZuaqzbeNTpFMjavPWuJzCPdxiRPdy9tR64rv//+W+g6AEBKo0AjCASOjAUmRYedBz26LArDXgBAiwzpJ5Uoqdaw8i1gQM4c66jZe1jtjkumAb/+5TEZoDTcUtCrbH6mmCnqOHMvGAp8ncAnK8JYfyGH+r1zNrG5MvLw3J+aCgVrVZ+h8LzVz/mm4VaV+P/jP+Zc/f9KZxhjfM6nRCILeQ9kfw3i8+m29fO3OCwzUgN0VrkPxtWNR9sStcltDINXsVuYVqMwa3HUXzjjDSFhAAAAHkTHMIuDxCVcgwJGNAresMRGXm3wJAesEUBqxyil96vzeOPKTeXc9xfPVdyq0Wf6LrdYixlprkwtWSTRSQ83+XaKR23DgSDMRmJEiYkuXtSe702ZDXU2p1Ld1sYJl1QzrEPIiMeKXCDIMR5BhS0Y1VqPJZYWu60cN0EhYWbwHDpAhiEoniYCANS60fyXLXYgYq0SrBAHshgAAASC97cwtbCzrRjAsTBUPI6N9IFliQlk1xs965FctmSXslmxeiRK00AI8oJmUfPuh6gfXjBEdet6RYzYxrtDo1F+BRxvDkrWl8Y3murfH/xr1zvFb7u4NmmCy7aVXZAswIVDjzJ2L//+5TEggDTZTlHDcGcgj4maVGzPhhCNUs3/MW1tRcvVZLCv0OVjY2raeVqOPtOKx9eRspp/FGBjFjrG3KAEgAoCAgSqowCFTGFpyXCAqTS2rcqKVo4K6h9gD94TEUnX3eqy8PAy1LGooYeMpRuD/c0SMMsWgQm/nbZDJMwGwQUCyirf4kfiuomafGDP8IxyUayEMix9RYDVVh5+zOSkesoJM9RFjUG8N9cLLMu42f56Pd95SJJL3SYbW3J74Q9CWF0/ZXz2NB39xrF0vDKIAAAB5ewxvGOwAmpmBjCMELKobEmkmKhkBvIu6y1upfijwHA6oPJL0qzS1XEtcfmbO7WtimtHIzeMf/2b+mqngD1KYHFw7H8DKjTHbmT1LJrVzdhzK1pT70g7qy0XTedMOIuMOagTwd5Fk4E2qWJCmhcrdbVdtTIl6L3coO29ZYbK1Zlb+4uKt6LWMV166yyig08orOqAxg4CxIGAJrLGecBteEAqqFjyKycg4AgYAfVDm3/+5TEogCSKTlLjaXxwlqnKOG2PjmzoBACvuUy9rjX2JUvpNIl0DkpWoulHbRsO8YTM6yJahCDUiISHThoEpMIrD4QKjsyfTQrYXhP4uvqUVJwWh07pvMCLR7p2nYkVcHudRJA1TIXIvpuKZAItaZ3zUvSQ3kisf0vuC9jNrI9XU7x2wRrZu2M2Kw0ZFDxr2L5Gf/9oBCVKzmdaZnAG+64WsJ1oQM6GgsxU1eEASNRktg7CTzX3YTGKA9R4/u44hQxsncW/P9TqZNmHoUjvnbFXjTrXj9yt7uNXZf9A9LEyj3YDwVk/7mcwU7WtX53MHFZ1mI/ZEMEiWWC6I6SI5EtAK6wwqdhwvM2zixDLcLfwwq6FxSkgSQnb0N/dhkY0GAsgAQAAP6pUISm0VTgdVEtK0tqily8AgVCaIoBcAQkDKTio4NZMDRVihHEJTtLa7dJkN7Yue2cyirlV1EK1URTOqxa1sU1v/XzKXxhV6jX3i8gDKxMsfqK5KtiC/c6QsT/+5TEw4BTYS9EraXzijOlaNW8MHCt992YVzFJ6WMnyUOsKEnV0dR0qUdSdN+zA2Lcq2v1VEePVeVFotr3gNtGxWR4jfzQSFTgfFcAAEoGckhE5EdFKQcD1yKrLtQ4KkKoaAoQBQlM6QIyQNzFgrBxtMGAkKBCMNKa80ysxxZ8KVzADvVpA31SBZ+K/Iq3alj7d18KWkib215NIVV6VYsf1DGcE67jun3TYXLb1QG3jxtcib/QJEV5J5uExxNekkdLn2s5Wo7dgqRXYuy6DZzNNZ5lQIWKrO6pBcCfU2g9KS+68RQpcRSsdArbdQQJ8Ns11voIga7bisCu3JtEhgYD0DgCFcNCkhhz////tcPyrXpRa5FuoIIAACE9RUcBxYFTDaa0wKg0hfdNYw8CMDBDK4A4IxEIODAFLkFAbkJOrQYfHIrI3/r24CkMhsV627deU9zr5X88dZc09L3Y1IBT6HgR7nJiHalW3qS3rn4gSQFh/Bjw77SKTNNNJZIICJD/+5TE5QFSmStIzLHxwygr56HMLrglWs5vveY9b7rQ8kUXFUqiyHDpOYSeYy0gGs8LfRMqQ1lQXE5JojTR/Nl9OkaDyeHo6QpqwEEUYPf///ylSOzYxF6uAIC8UbFbUaHeKoEwFWVXqEYXBETAETGOpZ4YiZmEjweYcAJ5IKhgepst5ltkCrpyYKmXSaeLqoo1q4WHRo49BlPO0yVOqESPMrh4syNngRZ8WeZ3ArLAfJ5GPFwyyrcJuO4kpQOAJtOsiqUitc4Sff6iYYdrtCzieIk4mRDI5KjLRZLTcKAYSnFgO1BljOcTYnpjHSmC8heF9USuhvYcJ9tEnk6ZIfUzMeV//////54sVztrT2NlzL2AQAAATKQ0S/GitBLRJZHyhgAg4von8YzCw4YxMjmQxMGA5XBcYwsBW6EyPA6KCyHewKFkeNDPHu+kcGNRtrAeqLYXW6M6mbHj2ALAAmi/EUZzhUECke3tHxp/InJxOXyBVDU2PpXgyUaTYBsHC1D/+5TE6wHVtV1Cjb18wuQrZ9G2PlmaRIC2TzKHpbLOyQny7VR8sKtTkRTK5SGO2EmRiGjBRougcQ5U8wihOdBnpYsSiiyNUaaG3vIsmVaxu1tKmaoZ///////eNvybfajNYALUakMDpzuCMAjBB4HjB46KIaTPTMWkIwQYzIKjNnRAHEEw0LCAAhYIAwBlYKQuT5jDClgkxEW4MK88lArdKhFK5+rXFiQ8uAwxESxCEEhjHoLWccQbhuAigH0To8IiJeQ/A/3EZplOMI8CRkzDAY1G0wS+FyOZvNpaeOZbi9RUNMKPTB0vpxbnqWZjodqF5PZXNNmZvRavCEl/NxXCzsJBl1d7d+p32Y8ZmYnDCiycakopyVszxiW///////bE2ptilYAABASSCDY8czowCQGEmulAGCA0MROmCsKGh3Jm50ZpxgFCUr+CwEJNPZw/jgPW/E3CoDLGcWyt0JS+2VjlsyAbwHcUbCrJTkWFGkjjGU2IapIT+0DTZTdmphb/+5TE7QHXZVc/DHHqmwyqZ2GePWHnZwkmQbHK+Zt4Z0NNVQfEBwmivWyd7SsOOuXFibHTQ8i612yPCY51YYIkYhYt5/Ggw2u4WnfHpDxA1NmDBSGHBD9vGhuhqGB//////999iKEQBoJYjuIIywGEg8yFNClgUMwzAlDUiBWwbiZo5aocMM5E7pTj8B3JjEsFGi00VQwytiUsttPzeh5y5ivLZW7li3i7M24I4AocCgWtUsRkqWxe9KZx4YoX6lNqnls/YtOnpZbOiyjkLnXOm2iqmI8UN517NR34hGu4Ukkh2gqT9W7S513QjEQkDszEss2M8JTGpqu1trS+1mJaDLIFAVuRJQpaVEVzM4fxUbsxuFVaa5H85Xc7DaO6wL+yGVqCvJSc/ve/////+O71rSrAAAAAAABX2HDc+WGAAISMR0g2ZQEmaGSvzBgYHEqd4cAukr+STyJylKlyb6aMflVDL4PvTPafOpSYczvWL12tAaiStCux4xZGWOrD2E3/+5TE4wOVbVE+rO3swy8qJ0W8ZIgqk8iquq5+q1h3WXBH5LkX48KDuW1bBr8/cHXxaFC1/X7/wxSq5Gk2ZGH/fpXTW3v4R3sBSmoTAU4g7+C+Su1a1RXLeNwdTyZSqlVsCNGBXf8JHHFAwVD8yVVVAzpPk/x3Gh0xmAOqBy3xwKSocCkMwQDBomt5LsoC5VBr4t+1lCalbJ3/k7n0k9QTt/53Kk1Ypa0oylbXW5A0TVMovPyyE0tLaEg0uf5bVbdz2o/juJAvJRqHZWZOkGJ7OpOb0w/3Tsx6xmwHqZcHpkG4YUjXfRDfgEuIPxnMdjEcPoriAJ5Ls2mRTRo8R932XCi7YEccSkcHb7VVJrMnzDJ8qm9KrWXveQplpgMCHLQCYLB5oWNmYgqYVQZwcFBwGEmYDgSDiAwdiLUIdZrK4hDrcsVytvG0+XGR2RojNBHMIbr7jcPswdVl7iuKVAwXGUpXE9WpBjPRgJiZkpVGaX3vGom6BYMxmJSCnNUIzz//+5TE3IHVHSdHTeHrwqanKJW2P1hmZy+Z+0RzfVdtz+5O+ciXa9yXjpzEh5lJssMqGHIcXI0RCoqiacVDNQSxX61FpD3RqH3ohufj/I92PSaidWFRl156Md3ev85vCUdVANYIsMoiYmLn8AQGJzSDMJegSZgaRFQEFNbqCgsvxfcLon4dl/JtqWGmSw0sKkihIjMri0NSykmK6u3HdWdrQE21qaXhD9WpSTZEVE4salIuuLsyNB5tgHVzQSDMFIJShOG58jFafhlksSd7EOQuxJTLKkuzmsyxIiThnUsIY3xkNOsXMeBPBqEuCrYDPLktQVEq1V2iRdRnEeaVYmlQpWE/rjETF6v4dPhNnzaaAAA2hCwZDzIgYcjApg0OGULYZHDRhlYu1HUZepIQzA1ZhKCnYAkzqNrcp68XnJE+I6GQGg4yTrR0Ix+oUShyJQtXOLIJwIUaSeP1yVi4cEq3qyAzWyt6S6tWGFaXN2165Qo8DPpqW8DWq3tWDmeLmMz/+5TE6IOWQTlADjMairYnaAm0v1AZSuFE8JOcRIGK6phq+RfNVhWEW4l2URLuC5QkSYcYtQGxQiyJ0uquHMoGOmD8fnUfjAwREIRaVug9LmT5X4kPE3z/6OsJAAIxkGPRpCiGBp4DQGDIDcwyUMGWjIAEwE9BQmm0CitUxfWUPo5CK8gkcpiLJpRB820monK3MRAUDxtv3tpOVmHQNATrQHFmU3nUfphKdcFxOUNs/UsrQxSUl2qkapYKCLoig77tzdFoZhqLIQFGHmRWtkP8mivO5jIsz0+hpzvXzxnZocZJwDgYihHAW0DkhRK1azGi4oh4VDLVsQ03WAlDMrxXZU9SqixP2uA8iywsf///MueNAFIUwmWjiYtMAjIxSqUHDXzPc4wGnCIjEhdSDQHgtytQt6fbdfTav1MyGZiTxqifxpDSTLh5y0SjkPRZZ1HWliMX86z/YzvPZWoBPj3jwWJcqWDEVy1rEWDqaSFaFSXwrsjymPBm3umnjA4SqtX/+5TE7gKWwTs+Tmnngt6pqCmzP4ltrVRzRqfOsvoIyGHFG2TJ8nm9xjJCZlUys2YS6MEdpMwvDBFuOkkqvUDMPBhJgqDuc0SdbemSjQxQv0/iiWz/XcKNCt///8S7AAIAEdQwlXPfFDIUE8EwMhHTuWweAzHzcHIwEHQcPDoHGFpo8W3g4zabs3JTLkEbrN1Hhx6wgJ26NhpUDWItPUVulfRKiaU3dNr0enaOXu60WPtTNk5K6LiDFx+mEoRYY04iR+vts5G3SQnTONRXqGvVczoca4wrMzRHha6lWdxZJdUhMuhNS8GerTeRaGKNkV7ifZJaiTHmzKo5n6sc47xXVjNvgwvNj////0nO/+kAAEAUGgwAR8xWgjGSbOKPoxkczPhiMPAExAKYaAA2BwyMFAciBcKSdeAtTEURIffe5ATzMtaEwsiDlLb0GVo18060rm2QLBlihKEAyYQCrhaDblvakBTMgcpga9Xap4fV/JojDxmXyIdE5G268nU0xVH/+5TE7IMW4U8+LmHrQsAp6A20v1C5V+tMXXlU2u7l2uZz+UqenhNxmpzZ88h9CgszT2mDwFgrRpDofkrZ6XjGggSgtlcm0sjRM77ybG+rfbXmZmZl8Qu8i3wmEwBAYwyKc4EFAw0EYzcV8cAEKJ2JAmYBEIChXBosQ2l6UjzqPj6IRuKmm+axPZm/UHrUgFoNHGJivlK5ROT0sjToSghCFv3tK2AaQKxqko32Vsl5xk6KcpA/k2N0myUNCRWK1C0yiler3upO5vY8GIyNTEwOHjQ/JmDuf/+T1bkkacisRbWhLHOeMk7+IwsbMmXBkeISTqKlmRXTtxoJp/PEZnqsQmK1NWJoT6WWR/N/PN5////Cn+oAVVzDzEP3G9A886ujDYqNKVQdBhlMbmJwkFiYTG0RNDbDICqN3xCRwl6NCZFBwwXJoCfG2Su5D9avWp5XyRT0877lpFtML1imFlgcoJC4hflr89HHMqVMTxZA/CBE9WHVTnVysgv4tm2Lr4b/+5TE7oOW/U04bmGNwuSp5sXcvXrGi866XK6pBmnrvdt3t4dIVoRnzMTjhdMUN9iBptjXzFjN56xTrq2Ia0LliRB/t5+IpTwCR7VK8vP3tYbPVY80GsxgIe6z/2EIAJAdEADCrgNQnNNM5sDgcOTY6JBQtMGIMMEiJ4KIAWAbOVZERoeEQ1wojv87biIet8qkq2Hn/l8O09amlduW5fT3oPfdNUYUWCoEQt4u8YitAgV4bjySF9XRa86KNrfxL4lTz7i9C9n7ymPiWzW0B+YncC56+PPP27qtM9ist6sjnnWC83h71lzy6J+xDxzometGOgpQYiY88O482HnDdoupVB3RFH0NopmZmZyde5Cj6leSei9Jh6ExyeA5heFBnGaZhKB5nQTZiuEpiARgVBUQiKAhtGCzsCW+XTvIEHleF+kdX3W2JBaDhxYhp0Zm5dTyWrdsTsmry1gr8JrChKw0OmWgAFh4UEjrnRTykjdIsEKpyaB1oc5rLm/anJWun3v/+5TE64IWdTM2LmHrwtgq513MMbhmk8Zu3CxBc5rXhTQYbuHus9NwHkOLUkCJXDKXpZZb+WBeBBgMTi5qyros0HtxYFbHVKvYtNC+pe4nPGRaPfuMR5SLAxSAbb62JQAAknjAa87VmMBEzIJAu8YDCAq6Mw3jMjIGAh0CQRBpQgO8dANVVulsDNxjAtBpAY1Gs9CImortvCIm1uOOXflmWMTi8xOsKWUh3USMs27IkIHvS7R1sTgOsR0cZJTHbUflwrul6U191x4dZb5XURsZ0/CvTUSHbd4qjyyLxfFMOhT0Lmu1BhdLTW5qlmWHUhsxkijG8nDaq7oxJwk49bD9VZBoCkTjk6dxKvpqP8w7539a////+ZurbSAAAD1AjCFs/g6JhExBLSZMTBkljAtoyQzMCcDfrcy8fAAgLBBZ95kyX4VtvzEbegaB30MJGC7ZIPl6hGA0bMHEoZrOEbv1ZjUzEFkrDKorqRbTeVNXsx53o7ATL32VXh+vzvPSq8z/+5TE7AMW2TM2DuXrwueqJ4m8PbLylPFIX4kwpIkYqq5S+VGMjhkhUB2AFwBJpTFpojRl6uMqE4VkhSj0MeNvfyw5q6EWnqFhk4w9j6d4mf/ZG/ozK450iQAADZWYQOxzoqltDHY0dkwsMwcRjFq6CEMYZYRhIamsScYmJZCATZqQ3VhBQRZVp7gtVQ4GQEghMPcMZOBY4QwsiTHNlgBtcaJzXmd3GQtgKoK5YGAoqXAJFUsRhZws+QRV5X+kSfE8yWB2x4PvXOWqdl9+9VV8T0VgmWBKIzNmKUiZqy6odLJosH4Co9gVNU0dpq1cseXzGr2Ne1LbCY6srfMVL/AVqjcWOrw2MSJQqBw56t8ktQwAAAAAAGT1EMcaaZtyLSmEAQ6bGWDAVKTEk4ILgUTm4HgNCC2ZjQ0HDhiYiYAIIfs2XgmmpUDARjpUADDgow8sMjAzBgJPxBtt4g+retJi0DP+zuzCGwOsg0sKHDqEb7twgSnitS03RiErYM0ivbf/+5TE6QMVaWtAbaT8wtkj54nMsbief1qi6HrXj1jI4WrngSk9dAv1cuZu1jeNbz64zKrJZfinJW9utl1lhuC1bRJzlserGN3n1x+nQWQOihv1GXGirf8Yz1fhdxsb5UgAGrCmBSAJg9URQIB4AjIFEQeGBeYhKBEOTHjhMXDIzCaCz5iQIgpOBgkLYnEYpan4KHLnBIoiVNEkqYnyabuw9CJKoZS9rkOKUNNaS98EqQnkhmloIk6QgkukVQmjO+5rwx2tDEWXqymGVKntlQ1DySypZdmw+x7mNe88cBFEcB8RmHmthz2Z4daVoWN4MgKD2bvhE+PBxxUiVvLaefbBQdePalFi2dhAtN3Uvr/MV8S2+a//j1Kv7/RX1XdJRSAAAEALPAMkpvowtcRBcvCgCYUJGHjRoAGYkYgA5EJef7NApYC4aYsLAg7MQBwMTNcUsTgMAFUfUcAUnEIKzgKDxQPg4DVw5blQKzxpLIXUiDjvhCWvLvZY54OB46u94YT/+5TE7YGXSWtBTbC8wv0s593MrfCp1e2SR5Go9A0DzWL328t3z1MuWIrqOYCuMisvN/ZZtrOtwPM6dCelPHmJimmurb0/l8LcsfdhyOzX3+tc+kPAFHR45x3//TR3x/IPWu2lASABWbkQLTKEJABQifaphYGEADJ1RaUOqTHHAP0EoLcGfhU2a0ylyomhstmfQcZMCnCRRpGKTI0YVqaxZjr7RdisRdCD4tJopan2Fp2xqjkjpu/RPxyKu5Ztu4+rywBjYaBR1J7KXgoCSkYQtghE7K9ZqacKuTmtyjaqaNV9r7lXpYzIVjSpSKiKZhSXfakolnHh0OhxUFzB1v//498fwp+qKqAAAAblGAC5xgKtRjCfDAjDQszMjDjUAkhigqehFn+4hlKICiRv04wLNDuOksFmwoLJQosDIApg5ZhDJrHRp8wBeNHISCEtAQzCIBARWFBUAAKNzWaQ5VYdDIYIMAFTxSKTpWemU+i2pCxgLQOBikX4rY57Xdb53h7/+5TE5gGWDWNC7bC7AocsaKmkl5mnH6HtLYyZUqQhmUqE+h+Z3zq6jOZoQgtIT56h9zmMLd4ry9Ye1Y1LeIRtz53DlniVgp23bmWz3WsWY658WNk3/rZyFRAAEmSoGJRLB4ITKXqHFSJAa3WZs0IAwXbGDanSNCiYFJAa4X6IgZQACoREIHAyEUAjAMNuidJaWCitpMVTvRjgKAhwG8LfF4ZxerkyV/WlKlm25I9xAtI78RikDy9l1GxHJNRey4TI7HEOVl+nYD+J9uAmPRLzg1MhOW3fXY7CY+ZDicKDhDVrwEHjp4SmGTBbA7BGtuVMbjh6Cn7WuValerfQIGEEOQSDO7//+o2+iuqgAAAG+QXADDQhkxhAEBQlZxgZSaUJG/LhmYoYwBjvQb6zAoiMwKBUgDAxgGArjoqYJjMSHAJq4gGFGYJmXQmgMiRsxw1IpJBnz6wazQWNO/HHzetuyjP4u4KABbMMEcARAsIaoVTKYR6GGQU+xyxEEttjisT/+5TE8gGXpSc8zentgsSqZ92mC5gHeryQZXFhYzTVUjgc5jzOoW6s8KeI8QlCGqj9W1Tr9+kMk3VE8qhhPmlhV0FjfxIbbGja1m992tHiL8uHzNB0r73f7iR3/51b5KVwAdZlKg7JkG2ZO6OoJoYwaUQkBYZIDme5Rt08OCZqCAQnAAcyRAHNlTwILEgcFASUKJTDCjjICSIAow6Gjr6xhVSZf/ZZZqUibnC4OoHDcdYYtTowo4w4ZWmd7DUihEOtEzXUWqSsNi4JhvMmP4ov0qVSRFJLAFSjQnt9khkkttQsN5wxV0LylEiU17khnQOzZIlLqrTJTttS0MVfI5vlFJnqFb0+5Oeh1YYbChKa2kmDANoYEPTNvY3YcNGPjPmg9tY+XI1wkzxU2bwiMmnGDRNirHBgCpgIAoGVGxWEJ46HUzqoyTkDMgUaCotO9rYiAl8wqMEjL8lgAzJW18FHW5PKncAhMAjgdTFDW4K4628YAHAIGIwS9DWxiRKk6hf/+5TE8AHYCSs8zentUqOlZ2G9MbiQlRK1tqYXDpXoTBYT9SCfZGrUBicmRTowR1aXSrXkLhq5DS+qWMaSyrVSyMzTMzx0adStw5PFlkXDU2N6qgqKNK9gOaVnzbUsWWlmWBIkAAAiU8IRQAOxR8FoNUULHMJhiwxAAu8ZXC3VDmmrwdZr7LmXU+5LGmKpVIBFJJeDIYs6s7ap33hqBKaxKZNn3OxuUzKvXRlviph2QrQCkjOKo8JRO5SKlHCJlVeX+WIJwy5Y+Cqgqaqqm44Jq7Vzn78G2VCIwNCKkK5CitAXYbaWazpoxaFhNB6aD+LWCU+n/9yvV6asnlVSwUWAAAAAAAREGS04KI0JBi4iUA6L5pTgEnwOxAcMGYvh5jycMem4BKgIKE0SQcJgomUDbx0Uz0lASBlQAASkYKPGVjhoQkZGRoCzHAYIBS04QAx98pcwGMyyAqSUwO5QOEgIhAYPMQB1Tfj+E1HyaB+oWJu1FoeSc7c0xc69GrbNPOz/+5TE8IEYbSsyDenrwnCuKLWEn2KzeQoUYwytUvfPZEU//atZbZVbd1B+YVqa0y1RTWmZESmEKQqc0nbCrk21y9//JKrRoQU5ULUdxcn/6BXIwl7uVgRiJ/Oi4MSdMHBowOATA5CFAChoYxXh4FBmNDaZnIwiJpsQKmPDiZeBqEBbowUEgcaQgSqXu1F0sDDoOHBDFAaODFwTEgGYZSQ0LzAYZHiqWmaamEbXwGVAwFS8k7xQGqUQpNgz5IRdCgiIzkwbSMqg1AarDZJgS5uYqVHT5ppIzmIkLEj58KRoDUTNq5PeqqWkWFTiYijEk0u0rsdmWbFotyCwqlAUnk/89kyZrpHsvFcNNpbbT2fClU////UqgAAAQAfGguDGBB4jAjMCUwAFEZYRGxlI0YgSgrRNo/AOKi0+jIPN0JQUMssVw3VUyjZcEkBgkITCwKINaOIgpjs5tZQgEGSDGHALjVGVhXcQqh5bcrlsNw2XCayMh3ZMQhTklczPs9l7itT/+5TE9gGY6VkvTbxbGuOmZMHMJtAcmddpXEjsPzZERBOJrIFxFB4ZLymIITB9ZN01j0KiaemkVrdmuFFLYe5zWhQmnerKgPnpc27+5HNC0ZQ8kRUO////iK7av+VaemIq2gmQBZiQAwCNRotNfLG4GBgRfwLBxlJYTB5r9Gd8dGOHZiAqiAzYlMhyIaEkwFJ5r0aV8sswwUEgBEBFQgW9nCmm+al1EBxZcDAgcDcBYBk7dldZt5GlJoPCpAyJZWkMPKYxWA6rMnGSGxbZ0C8NUJDMUiYynhZFJe7ZInxqOMMtQufjHo4I53aTf2dq3C6vaTclcIPRMsIUL0PS7/PoUD+t/2aX3JoQO//9TdUAAggRnpgpgEpZjo2HYCIicZlJEIB8zBYMvrznDMEPBoxOCutVEiJEZXLiTdHWd10lYggCFgBSRiRiVQo2M8MqIy8Ri4MjW2ZOxWOig2TOzLqruORIyABbBRBUEQlQ1IqPNwFjS2kYO1q1TgmKU4EMURX/+5TE6wEXMX0m7ekNwqml48W9JbpE42lPVnTksWBxGhQRZ3JZJG3L7exRYzBDIrU0m6bczUBV8bxjopo1b9z+qMWG2dEYMd1f//7K2gQyIQ7XDKAAIdISvp/ZoYyKGrjKAoYDS4gGpzMiYyJbBokaDdHhhQwBjRssMQABdhCJ8ZPC2eOsCQVeRKAlU2SNMhGDCQZSalW7z9Mmkr9OU16Vu3BKgUBlmWYqZhUPCgC6kQrO7gsFEmLRxiDyxsDFy9aGB51tllxap84uohbXnI7D93/SswlRUcmLKmrOWepe6i9LIM1YpG97y7z1nlz12G/y2VZQwMYhnI/Z2//bzKjYNiEgihrsRBBiGmWVAERgqBDICXPmGQ0MDTORiS8MIgQdFRnUjGAhiZxHpiN9mfBaSnEBMsxiGQwFoOjAiAwFSDlzR51lJiCHWZKfomgY1QF9ZY7EVac7b325Vn1xYIjzfwI5LbJ0t2UXjUelT7OtAzSGd1m6IPtXbHyRypicioH/+5TE7oMWFWUYbaRcyt6v4km2C5jZ7UsSC/nrGNNAAJgDCoiTIokq9oZsUOQMbSyGyzjhaQpTabhuRYiptLNXMlfpzT3j8s+vjmc2dwj/f///3MrqXu7WfP008I/Nqac1IxeedgnMULJkAUDJHLwcYHacwwZk7OlgiNIjBCA4iFggKJjTw7TQKgAwXNKZvWsagjmFXiO2CviUM/6ms08U7laaO6WOlkJVeMXpa4XPr4r3UVeI6uAlRh8dpEw6rkzrDr8ByYVPLxKByHMQLlYy9K85GtSqcO7V6s40n7W6xt3k6zkIOZ0FcSA6zRVFqQ4cKPaRm5//z283iIuJRqHF3uYU/WowGCEwbMI5fM0BHuYAGc0MxOKAw3IAwKGoIGYxYLowXIAwZKA1PNcBF+YNBAgRAwQiw3qqSBaLrsyUJAoOqyCECguP4gAQwFAx0lMX+dWikMJa7OZv9LJxf7MIm46xlN4cijzztFGaCPyxizjMqBoBtMOBWsB9GVM63Kz/+5TE74IZDX0MTmExgmwv42mmFuhrOoj9bJ+8Z5H5yEyN4/3iZlP++Gwq3FYipG33tutApmPXMk+83mXLZJuHAjXpNhwZn1rN2s6lYQCas4HIHyPJ/To1U/zj2yiZMcUfV0XEBQtBz+4QYcAQlaALWe6PExOZkb0hiJYMHQ8RioSBi4x5tMBQzbmooTzFgaaT+UULqSCQw7lDzOdu8BQZmzDXceejx5otE9NJRQsWOkZWg0DzMqxYkODROhGEZGRaKE1ECQpL0bh/U6tkyJXs7Nbc9uhSFGop2MoNzgnNRWZBrDOZGgr/3Zo2Iik/9XygciaAzC+i/UGqAAABECTMSLZgIoFG86yCgkzsYaWMlZAIGChphokSnZiwIBR8UNTZiIyQNTgSTFhF1pqRq0SVdkvX+uwwACmhABvzGE0nmfJcRoznAUxygNSsIURMYQwwSflsWfEjTPDeHy3mkN9FHQtklRK7ZDJUrm+VZPoIrICFtasOoJYQotp8mJLWzcz/+5TE8wMaLakGDry8wjilIom0iuAOZ3D+YHhqTpk0aW5xIg+WlZ41PMGbmLpm50drUh3Qq34vmZ3LjpLDuNZBoldQcb1ur5+VfZ/1+Ihxj5Kzy7pNlzdFtfzwBGDgFmCBfHyx6hhIgJCDAIBDGgtiYHDAkYRYfjIAFzLUPjQ4VzLA6DDwEzEgACoBJgwARi+EYNCsLgGwhCQwxFwLCC15dM5r9LgHFmAJ/qZxaBHIeOlZRVa+4TfpIoSZO4Ka7l241IYnqVNAj6Hr8tgZCjA5rk0VuA5qxGc5ufxiD9WZuQ8nbyQylsORB1muavQ3WzsCEI1h8SEe+fUOHcXgoHpJYQZZwhl0VwaHorP+3GZfS05l5NVX1/Uz9////Jxgv4zRDhqxZF5/6ncmxHElAIYG5JLDe7jMQjQZA5fwzeFwMgU7TIQAMTIosAcwK6TKZxNAgYwqYTCIHGgUYZAhgUPJBPFLJa6CNaNCrBIOqrl+MMrEOVbfPGOBMuJsuylKg33/+5TE+IIZdX0Vrb13I0gy4IXdIjidjRyNYibrtTulQXxuQBIzQG+Ow6ziy31jy3jO7J2JGhKFPQNNbDEf7RLA9z5vADwkPHEFpKPtqAzjGESw8ph/oPq3+qKtjv1Zv/6f6gOzYkjLHGzPTSXT9BdyACQMHlMPgw/+AhIpkw6R3MWH8IExgwHJNglAGORWZSgJnMGAojCzeEgsIAQYzCJggEuJB8M0U6IAPIIoYbBiggAgfAG4eWGgMHo59CuYSF46E5cTRQPcdSKeoUsmoJqgOiEMXzkvXdxcVnVO1pZmZxkqpHqXdjhrj4qNHlX2/ZYw6VC3N9W2/RmQWmjinK7Fd2MR71Vf/xribRyRZtJWV+IFAAJApKoUMG0k4a2DCYpMRBZ2DCiEAxWEgqYSGIXJRncBmVu2eAOpjUYExxMCBUwIBgKFhwJIB27IqQElOYMAi3qIwQF0Ty8L41Hh2qheTiFF+PsvJtoeklov6fIe7IKoWRcSl1MAkqnMAOcfacT/+5TE3wMVsakKLjy1Qogt4c3GFqjSGMGkJP5uo2GiyM7Y4Qpm3MsY6y9trpVtbxixbMJFFSjH4t2oOwpONGir/0/xjR49SRV7KhCMw50KNND63/xgcHsOohnDiKMjHl3RsV/io4hYF3jCyVOpDYMCBh4Ar1MSglPYwkBSwDgIQDNpBMmukZI5mASGDA666+ggOCQRTW4tSBHXTKYEvAlBjTgkOScbjyUTjBkhebqF5GJK8cT0V4UT1cwsOzDhGA0URWQh5gWM0yOtkZpHRVCea7RkswHCKHkTf7AtGVuX6Pgi9FDU0lVG/g0I5qBlNMC4nJEq6PEBaMckGLyE3PawOgAAAaBGATFCWPWKsxcGDLInSyMmBkHD9CSYOCYJSBpkXmJnqd6OptE9gZjICBwIAYGqHPeGAdx10DQPTRLUMTHQsXRUktJAM01xH3NAjeZm47SQpMg6bGmoWwWhaRi4jLs81OhnM0aY9RlMJyI9jN5YvBzmeEwH9ENZHtcxqJD/+5TE7IOXyakIbjy1Qm2lIc3GCqhhYGI8JbseN4iuYSHDF5uyIPZASMRDCVP70/wJiORyhVTPY6iVQg5qtv/gzwrIKItRRisEHoNosH71B5FCRAKKhYaCW448xAxeZeiMCMJIjDgAIESJICw4Aoc1xpPOsjdxAx8WIAtY7PFB1qhesVC3HavjqBmoeqS+AI8Eoj/tOhZyM6JRInpyMR+HKbjO4olltbR4tE0Q+2RIsEz/R8stIEeF3j1MuiCPFtuP9sDNkOezp6+T8bFy6jzCkv/7oyAjSPT5iNup3+NR1KnGnKJBGqoxQw5LmlFFn/xOahzOXJvUshse5ZQst2sxMCgCMNQWOJzYEQLGmQRgIMTA0uTAQFguNBiOBpiGSZoyQhi20JqMCoKaAwqA0w/AUGguTCMYBAcAQELNmcCM8kAjw2YUQDXjSg0oQss4LTW6wKLtYXGJKXcokjaAEsGW2qYLgRGGlId4vFXOVIxRCB4I1ARfgSgnWhFVYi5EcX//+5TE9QAXVaUGbjxXCr0xId23njq9tBTSOhksFV4nXeCneJrzIoHQjhlnNvcqq2/rnnjpMcdtu1WFYtAwXypuWOZn6P+9Hb31r19uxsh/iEamSwhEYbk2EkqJYvcqghKgyJYmEmaLGrdXQbiEIARb4e0lHTFgpehnYnaIiAxkDTqMDGQYDgaPNMaThks1UjNGDF+rxibvuRDT9VXLZhGaQIC4u/rUHafu9ZLsKcunMZwTieTQ/PlUpTs6ucEJLKNO8hwFWqeFtRWjJfbSp4HVq2tq1WOLVzM93zNKsnfoliDhIfEVOhv3T/ZS7JEHM9T70Vmei//UWkqKNRQ16hqO3ixYBICTnBQI1DzDQhEYFMDhyRAEDGKwCmWXABpaMbi8ygLzmKSMpmoy8IxIAoWqbLOYO6Lsy6LoC1iQEEBRfKhj0MQqtYlBTFpBIA9gkWQAwqPDY/DsPUED4/3WJBHKRzCoQgGJl5fLbh/e6UunqEhFA8lLVCyEXE2xxE/D0zv/+5TE9YAa1aj8DuDxwlkvIZ22FuBV8G/z/v0Cs2RbewlxCVk9Lju+I6R2pOqXDSaXenbxV8P///8D0EK+TXgQxjJVjoa9Z/Hfz5B1GPA0ISOTcIOE4R5QwGGDiIYTDpQGDFgwMr8YyeRTKVSMVUo28tjS4zMijomMBh8LmPRiQBKToAo4QhR1Pxxkh38PiDzkRwgKvGrwx7+LxgVGBA0OGqEOurUFzhwU4FzJCMHW20p/EtFhW3iDZVfJrLmYZGakQhXM7l2M4/LuWa01TQDII9E3ChhpeNu1hU7w1ZNIxKf9VUcLsWJpqM3M0bZxziL/7/UpD//rX/4+EMjDDmxmN4+l5Y4wXS6X2JqJEJYW7lIkCXWcLx5TLPR+IZnVEAQAilCtEUDTJBhBAY2KwswEPEAECAQvCSqhhRmaAmHT8hIImMg4iAE8p1Lq03d1qkDQ1C5aXecRYNpzjwiMzLqg3ArQt4JhgPKwQ0iotfGRaRq1uqDz4rkdYQIzyW0x6jT/+5TE9IEWpakI7jEXA0Q1H0HMNjhyH2m9fcccLxoiJ6/86Zl40g0f+s0wtQaNJGxq+MZSf45kukoQHC6Zle6qZsyf+MYpajFHRgdYjiFEH6ExPqDpiMHGGjEeSEZlIhmf1sh3MWCoeEZg4ZGHCqY7ZRi1JGLGMf5qoQ5DJJYDC0YYFpl4YhURoJBEAGhqg4oNEKEVKJQH0iggaYwSYgSiDADwO3m7bck6nKc6gJAowJhlVCJMnc1CdBbjLLm4KdeHXTSIS0aYwN1XGg3rsy3CvBlDGaSG4nG0wYXXXdQsDbgj+8qmFHRzv75aEiw+YZ+hzLFJYVgmYa46zPeiGqUb+7N9G//1c//x4UmFFkBoNzQsIgqAoxIgUQNUBcBNVCQmijzFSwBo4gCL+krMY+lgUCOGMUVB1MBAEFgESIDCC4CrJnYQCK06gRMFGDFwoABQyChwI4U6tSfd1agoDOIY+DKDtMpVpT7zv3k8LSXvbK5bV3xcpKTBu6tDBl3ULxv/+5TE5oEUNZkM7bC3E0w1H0HNHjg2u25bSTCylbqecl7ZNNI0w45NW0AERQSqLyR5o4DiDf/5LQ5F/rzsNFkSrJ/p//0T//r/+onEnhaIiizC8uV4mMJtqMJGCZQiXQv8wUMDasMEgkrVjMZJxQAFBERCgKCjJAQzMyOjdDbAsFBKTiCqEaeipXqUfl0BjgAmz0IKEtVAIVF2/RFcqc7HBDmZDyFn8dpLyfGIr9L60qkgsytuEqjEtk83DMNw3OwR7s64gZRaiYKuA2EwWykqcdXtbPISjFh7+rWHY6Eh4eo6zknZomVTqv7sxq8TlBqM1W6LbWpFP/Kjdx+rFFPehsTa5SXqR7FlQbGVAACC0hC6m4qgUGzrGhQUSnBCCDgCIxgsTZKNGeexrYSdQGEBMYUDsKAwIYMCvXI4hA7ksODgdFIxcZQC0qQAcCV4MVQhU24a+3FZs/8YQGXHpWERrbSXS6ZBxkkFgSBcJtgHr2R6f9asI+4bp1aQwJo/Orn/+5TE4YGT+akELaS8Urq1IJ23nqgi0FyADWEfCoRWp+ajtnHBWv//4DikEUS3rQ2/+B6Rzf/Wy/MBxBbcv2ifMawt1X//9jx2WtIfCiZdlkusSELIlN/DD9CgqDiRJgoXh3gAAIMSoUvoY7MQsUSzZhECGPCuNKMxBQDW48MzCwBBIBAsCA8mBqajyNIZVSP4gWhQzQDAhTQNA83jgynW8gpwjk6TQsImAk8BDg7hDBjgvqqFCBfsFhTH0hyFgOI9EXC811uE/dy0ZzdQ1fmq8aaJ8+pzTmWJIO8ZJdw4GP//z8iPUGiDbF9RCfD3PPV//EJUh20138v/a/2Tp//+kCEegcSW5Rbm3LybxiU6BKDW+BMF7Hh2JwCDAOIjYaQKYsEzLpwL/gVaoWrTIQ0YoKhh8gGEqoZwHhpormKA0YBBoBAoQDBGBVxlSNtCCNISKWF4MAoxCyFhKXiZL896MIU9JQbgR0LhRQwK0USy6VLOZ5/K2h7OK4FpEhUqtcv/+5TE74OXVaj+TbEakvW1H8nHoqhrluhwjpixp37eYjah1KyO2FUCvNi+3xUC8v4ZR2F4vF38ruD2PMhsTuUo24+rZ/q9zGuDxLdZ3zuUn/6ChRHOQRywkKUYarHC8m8RhqXG4nEFSgPxdGoqJAQAoACAHVKBCWO+De4zxGaNcmLNLAKWCKEPHzPaDAQVsJitbVpTPbaG1QX1TBwBZaAEGY8FgtY6PCPnz95MsHaFeLFZuF7LsB3DDCvOCofOI3kfp1rtEc6VoSuscnf61kw+s2vWbTMtjBM//xJtCujnY/GndGqvilTXh8ivrs26G7zfpExe2KsER5GMJoJJTOdyKJ6I+NZKwwmkTupQJgmZXGSUQk4gKFTCIFMhBQwLJjYBhMwMA5EdjVotIjyfkMZEChlIsT2iipy0xRaEggI4nwxYmXWtAcwqovFnU4m4tesKgwS1pHgzHB4hbaRJaCigF/XoZvCo/ODgY6CX4QViS5SD7E5M0+UCiFG2K08AgJL/+5TE6QAX/aj8Ljzx0ly1ISmmFjhSwqNCVaQmC2mQ0n8jstYqr206YIkEXU7El//jXw+rpFpV5P86ebg5pX5yr1te1j33/j//fs4eWN/9/P3j//6z5vrX+Yfet7e5voDpnju3jeXE854KgcWqfJyzRI7WnPlsLvCq2Fkwia0Fpp0Gzag568Zlg6QyRAIJgWgDzhuMg+xOaBTTU0cheaTcaUyZlbf5uqiquwSIW9BJ2t5MM4Ytm0+HAfj9TDaDOJUd6iH+ZDksLp+3VOcyI1DeZm1V2ZT4X5mWSE+eTzujUT67Z93Y1QZikowMkG/cHqTEQJf8Cbx0sJjmUsjTG6xlOv++X//r+f/o557jxRTXKqYGnKHsjzi5lC7bnzhqHghAEEAYw00ANLH9JjqVCo05RZYuQBQAyQDMGKjXhAEhyA2AC96TcFQ9H7OLgxlkOTS5oIx0PtUEy9z9SdEZsHB6EZDUkwSYlg/cU4Ll8tPEpGWTNcWDJeupQ91ekQjtEPT/+5TE8wOcRaj2DmXtwos1IEWnnqh1HaTig6pi315peBQKg8ARQn9QiPRxwx5B1pi8ao//mYw4cpSoUaplFSijrkkqITfpojuwOU7nOYjjTrynbZqig9Y0gBOCYA7HkEK6THAp1TAROFCouChpPU1AfMiBAcomLB4ODERxYKIg4eAXReCO9cIoCXhFBbE1FuQ5NwVcaUa6yyk7jtJ/oeTpiOQ6B2m41ngXp8sINjcjzL6DrJOu25JNJwqlgshU9aK831eQeLtLuSubk26Lw2sCjtARSwCoEhkqtfE/ISBFADxx5zliKUOiZ/WLL/S/gdW1cJlj//pf4+Kev/7vEMcKjXGlnm2ViA15sDa0D2ry65KImwiEWgAAhwzBJwRhqwAACdJsOXLBwFd4xANASgIyYiW0d7jdWFQw7jWZZXhqLPDHCzc21CUVcXjo70PRJXRoQ8nqB4/h+fE0wQh+V7eNhWD4Io4MTKTi8Derjm/VIw8lBceG7lQjMzuGYNaLku//+5TE5gAUjakI7bC1QvS1IAW3onAXT/UWcSCJwmLnZhNmIJ6mQw33xgoKnUlBFxog6oKswx3VajFLf6ZBZjEkEyxrC+dRlrnZRq6lBFExA4ikyGAKX2MBnjDwCFlBE9yJzWH+S2CwcIgcwAgM8JTCAAFDStoqAw6nNKnJXSxRyjSFxBoCqDBHpTjMdIpiXawjzYmkAqT+YU2eZipUi0e3udWSWqYbkudoKc/Z0oqmFCUg7Yye9FsSlQw5FekI50OS8tEgUTfelc3SFleBRTvvn/e9yVkm0ElZ/x8Wmkpn8rvzArR6VhqmoRmS486H3T3wauOO6+OZ8+w/NIHTZu9htFudUfELxP/a00tdAJTg06YBgFKzBEqEgFoyOMYMuQrhaqFnwqgSrHAyK8mV8yJnJOKtreThnTzIazWCfVcFja30VKqBNkvQ1Si0hwiWLmfxb04ttDXqVkHFCQ1hZSQLatdMbOwO0Sj5rszGxnQXYjU4dSoU6dJOtluveBAhqZ3/+5TE6oAUpakETbC3Eu41IJ23rjjAnmbo17yMM2kp0/WxY44GnbSREDOJlntffpCz/RRV82/PPit3PPiu36ut8PD/Pf/QrL6bo6vO4TmUtd5lbaZpKcazyVzFjtMNGgIEEqyGMAu45G0rRgGmkLDEIDpJguBTxf1GF+FKGunTFqqRvK86AD4OgWJd4iJlURsF3VDYhL1qZGRpRKNHyS2ZhOlGLOjlSTGbo41w/fFtVbgzO0gtyMKuPFTMpvuakQ1xZEErjDcNRvjDxBCwjUE40POo4qhl3jbQK52M4gYdY0sfVX4kW/sd14pU3fzdXN//pfX/LfYwhhZxCO9HPWkEFYvPsmof85dDrYWMmBwoqvYWa6ZiTRhEFCQGAhUWOSIUMKCzHA161BUd1JsZUobSkv10738VwxlCiDVutDpWdsId6MQynx+UKj7owuRSGZUFR8xkjsdgW86S+6Rn7IpFbMAPlcTg4VGR9IkKkiiNMksZXOhitNC7UslNL6EES+P/+5TE74PXdaj+LT0x0rS1IAGnojhs3OD2m5jH2xRbGI6myczUMLMfGhyPMj4PGX5VRfsfxE1NcJ/P9Lb9VameWhJS6lnQKuYTyUpt9CEVcH3FiojqoRjkAEx0jBiT+glBwcwj7+rbaKCAJAADFJhgIDms6MMLRrTEUuVewONu9jXWIo6z95VviWVkqcQSzG6Jx6KRVUUk4SSwrCdYXfXOLWzsJyyZLj/6HYLIY9o4x4YQlh2Sg6JY4EiogRpQbGxghWt0PJ122ZPXFc/7cH7Kbsn7D5Vj6ujPGiljpTlUqFDgGsZrCoTd05yzmFIlXPhyRx9rBsaHD5lEGCiNMSwqPob4wWLxiX24jWIMKgFSotL+DscKiIkIAsiao8boo8EAMHCDDKxEbMoIUYa0ztvWSUZDzmWT9cm0fgEyU6QAvIZUtSVHJVXHmUJUujIEzZ0CbMBvbGx47JpOzo07kONeyftZW0Vb2OtsrcpqwSCo4c7UfqVspzUPQ61VWNNp433/+5TE8IMXEaj8DbEcgtK038mmIrAp5ARJPsdKpcSNru3Eac26GmTXLWL69OKEDEQTPb0SKq87wsSXC9c4nffu+O+GoRBGNKE5iiOtw1jefaTrw+r2uQlXmAZPF7j5GbIPfLmANaX2OHzPGzJPTEoUK0+WSqNp1vs4tM3GMNFcWGWRDpJQRbOFVth2npc2R3GWX6ibP5EmaqT8Uw8E+yZht7AyqZVNrCzvKvFmEXY3o501tTU5GjePxPmCzRzdDqS6tQnUrbeKu4hs5knyA3N+/Zupx004cc0aXqtW15qHHFpYctsbqKD0Re75XQZHxzU6nccbdB5USBgluIysE01JG4489wPI2N8hVpacuSkmVQAwoADfhYZOGCxIBEiRqEy1CYU0JPRsUnAUkAgkimFLLDErL1vk/sPX2nOutEcNBoADEFQHKZysXkSP9DkLH6n4DmKcIyeZPTCEWIqMvxGhJIWc6NURqs6GaalqOf8SRyYrwYi5KtkUT5Slo5XPBhP/+5TE7wIWwaUAzT0Ryt61H0Gnrqixcxoj1vYYva7yL86B1Ggwdb/z5Y+50rTG7esXGc+XdszWyZnix5rS5qrJGNYvjfhwPK8W3V9fFOsW8v3XyVx26KQoyS8n8EdFee2Tq6J6hubPO2fC7BduG8kLv/ffZDFa623ANbD6k5NG3cirvDpyMjCRp6DonEd4fPTdZ5cuNRqFDRab2BuNrmNgUUwSi9YlGZKDLabWlWbWPo9trozVoJ760CXbUWrlCdDcbW/c2N0sXSL+pZP7LhtQ2OF/atXq3U1EFR80bR2XwdZJ+Xu+7zpFqf/Xfx9/fsPjqLXwDQ6Fr96lze6nlI91ydX5i8weKF+GokjgNVgRR2KqqypgjtDMzYA0rDbq1hzkgeJl51RAgURz5FGbk2aqd5NHUJjI1VqOhakzGWWcEeKlP8/KK2BvRJfvaB+m1g2xXza7MKG8TUsMI7PH4NIlA/WPda6clbUmrR+55OXVszE1MtqVgya5PB7fr1NLifX/+5TE7YMaCab2zeXlwkK038WGLbhEz+XL47qbS+n+B60cVbOWaycF1Hs/vtpZycrNOm04VjEDsC58cwxes6YWXcw/LfacGLe4kVTDHMlRUARaER4L5U0NVd/nGSHSLFQWsjxhF+R5GIMusUBUwX+hPpWKUtA/L2RmUJVS9aKS7g8aNBkw3rQL6jcgb2hDgqkqOgSg1rDAw8Sh2xc0Pxy7Wlkjr7zFWNNC6XH3bQ1WheVhoOq2nJvkzVEtQNtD3TtqzORLlVbxW6Ua67k5HzHZ1TMqwXiLuGkd2tsy6kYX6tLxOjWUnYIl2u/zpxnzN8q9wQpuMTQhAtZ1WNJHoaoHBXOS4cNdTHIgsSj+xZvYPVdOenhC7BIzEgLAIGqG87yMxf8DAPrgZcirPPG01DKG3epIvS0kTgWPQ23B14hHaWKxKCIfa7QMxfiH2W2pPDsM1K0ulNyRAFwOLYY7FFUPhWsGudwWKHUHRLjjgeD8QBGemWJRvZL5Gm9cNz0SQ9v/+5TE8oMWlab2TD2Ngw21HYWWPzCK0UPR6/yh8RY2pU2mdeDlgmL6GitN/+57eLafPzjawfohyBqZACh0SYxOHscFNWYjIeYvoPARGhfEWKFkx91s1DH8DNIYGELKSgpi4tiOOZIsiiXKyaRumYTAqCUKB0MkRVYiGRAJxKFjp4VJGkKT0KgmAUHRQLkq3mShYaFYsKiqBpWDKJdyJNgmIV3IryV5KCIqo2ZRJwz/+Vsoll3NK1PP/U2UScN3JRkqo9mMGkKTZkVDJc8iVhsZXdbGtz7JVR7Ky7KJQ0KZXDYyqebGWSVOoB4UiIPigXJU2ZXkpkoqERckNIUpsrQaVUeysGzFd3KasxVMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVX/+5TE7AOV2abqDCGbSs61mgj2JcFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU='

  var BRAND_ACCENT = '#9fc4e6'           // 这行字的颜色
  // ============================================================


  var cfg = globalThis.__DSH_BOOT_ANIM_CFG__
  if (!cfg || typeof cfg !== 'object' || typeof cfg.manifest !== 'string') return
  if (globalThis.__DSH_BOOT_ANIM__) return

  var HOLD_MS = typeof cfg.holdMs === 'number' ? cfg.holdMs : 15000
  // How long the dissolve into the app takes. Configurable, so it is clamped
  // rather than trusted: a zero would make the overlay vanish between frames and
  // a huge value would hold the user on a decorative screen.
  var FADE_MS = typeof cfg.fadeMs === 'number' && cfg.fadeMs >= 300 && cfg.fadeMs <= 5000
    ? Math.round(cfg.fadeMs)
    : 2000
  // When the hand-off happens. `tail` dissolves over the clip's last FADE_MS so
  // both finish together; `end` plays the clip out and then fades; `click` never
  // enters on its own and waits for the user.
  var ENTER_MODE = cfg.enterMode === 'end' || cfg.enterMode === 'click' ? cfg.enterMode : 'tail'
  // Sound off is not "start muted": it is the absence of every audio path. The
  // unmuted attempt, the sound button and the retry that a press would otherwise
  // fire are all skipped, so nothing can bring the sound back for this screen.
  // A missing key means on, which is the behaviour every older Host row had.
  var SOUND_ON = cfg.sound !== false
  var WELCOME_ENABLED = cfg.welcomeEnabled !== false
  // The sound button is a glyph and nothing else: '🔇' while nothing is coming out
  // of the speakers and pressing it is what starts the sound, '🔊' while the track
  // is playing. The words live in `title`/`aria-label`, where they cost no layout
  // and cannot go stale on screen.
  //
  // They are written from one place because they describe the CLIP rather than the
  // last click: a label written by each click handler instead of by the state is
  // how this button came to show a muted glyph next to audible sound.
  var SOUND_TEXT_OFF = '🔇'
  var SOUND_TEXT_ON = '🔊'
  var SOUND_NAME = '影片声音'
  var SOUND_HINT_OFF = '点一下打开声音'
  var SOUND_HINT_ON = '点一下关闭声音'
  var SOUND_HINT_REFUSED = '浏览器拒绝了声音，点一下重试'
  // Preserve the working default path; ignore the removed legacy switch.
  var CLICK_TO_ENTER = false
  // The bottom hint line. Off hides that one element; the title and the progress
  // bar are not "instructions" and stay.
  var SHOW_HINT = cfg.showHint !== false
  // A clip shorter than this cannot carry the dissolve — it would have to start
  // before there is any picture to dissolve. Those play out and then fade instead.
  var TAIL_MIN_MS = FADE_MS * 2
  // A clip whose length is unknown never fires `ended` — a MediaRecorder WebM
  // reports `duration = Infinity` — so waiting for an end that cannot come would
  // hold the screen forever. This bounds that, and only that.
  var ENDLESS_MS = 20000
  // How long a clip that is being skipped past may keep playing after the overlay
  // is gone. The detached element has always been given this window — it is what
  // stops a skip from ending the track on the frame the picture leaves — and it
  // still is: what changed is that the sound now spends the window fading to
  // silence instead of sitting at full level and then being cut at the end of it.
  // The audio ramp therefore covers `span + AUDIO_GRACE_MS` whenever the clip
  // outlives the exit (see enter), and only `span` when the clip's own end is what
  // ends the exit — there the track stops with the picture by itself.
  var AUDIO_GRACE_MS = 1300

  // How long a clip may stop advancing before the screen is released anyway.
  //
  // Every other bound in this file sits BEFORE the first frame: the manifest
  // window, the six-second no-frame watchdog, the audio window, the unknown-length
  // fallback. Once `reveal()` has run, none of them is armed any more, and the
  // only things left that can release the screen are the clip's own `ended`, a
  // decode error, and the tail dissolve. A clip that paints a frame and then
  // wedges on the network therefore had no bound at all. `timeupdate` is the
  // heartbeat: media time keeps moving while a background tab has its frames
  // throttled, so silence there means bytes stopped arriving rather than that the
  // page is idle.
  var STALL_LIMIT_MS = 6000

  var ARC_MIN = 72
  var ARC_SPAN = 216
  var cache = { startedAt: Date.now(), current: null, loaded: false }

  // The Windows caption (minimise / maximise / close) is painted by Electron
  // *above* the page, so no z-index here can ever cover it — which is why this
  // screen never looked finished on Windows. Its colours are not ours to set
  // either: the desktop preload builds a hidden probe styled from two theme
  // tokens, measures it, and forwards the result over its `windowsAppearance` IPC,
  // re-measuring whenever `document.head` changes. So the caption is repainted by
  // restyling that probe — and only that probe, because overriding the theme
  // tokens themselves would repaint the caption at the cost of dragging the whole
  // shell's sidebar fill and label colour along with it, which shows through the
  // dissolve. The probe is identified by the tokens it reads, the one thing about
  // it that is stable.
  var CAPTION_CSS = 'body>span[style*="dsw-specific-sidebar-fill"]'
    + '{background-color:rgba(0,0,0,0)!important;color:#e8f2fb!important}'
  var captionStyle = null
  // Once the overlay has left, a late call must not repaint a caption that has
  // already been handed back.
  var captionDone = false

  /**
   * Watch the clip so the dissolve can be aimed at its last frame.
   *
   * A per-frame callback where it exists, a coarse timer where it does not. Both
   * are needed at the call site: rAF is frame-accurate while the tab is visible
   * and stops when it is not, which is exactly the state a `timeupdate` listener
   * still covers.
   * @param fn - called repeatedly until it stops rescheduling itself.
   */
  var nextFrame = typeof globalThis.requestAnimationFrame === 'function'
    ? function (fn) { globalThis.requestAnimationFrame(fn) }
    : function (fn) { globalThis.setTimeout(fn, 50) }

  function shuffled(values) {
    var out = values.slice()
    for (var i = out.length - 1; i > 0; i -= 1) {
      var j = Math.floor(Math.random() * (i + 1))
      var swap = out[i]
      out[i] = out[j]
      out[j] = swap
    }
    return out
  }

  function pickClip(clips) {
    // A pinned clip wins whenever it is still in the pool: the user asked for
    // that one movie, so rotation and the recent-list both step aside.
    if (cfg.clipMode === 'fixed' && typeof cfg.fixedClip === 'string' && cfg.fixedClip !== '') {
      for (var fixed = 0; fixed < clips.length; fixed += 1) {
        if (clips[fixed].name === cfg.fixedClip) return clips[fixed]
      }
    }
    var recentKey = 'dsh-boot-animation-custom:recent'
    var recent = []
    try {
      recent = JSON.parse(sessionStorage.getItem(recentKey) || '[]')
      if (!Array.isArray(recent)) recent = []
    } catch (error) {
      recent = []
    }
    var fresh = clips.filter(function (clip) { return recent.indexOf(clip.name) < 0 })
    var pool = fresh.length > 0 ? fresh : clips
    var chosen = pool[Math.floor(Math.random() * pool.length)]
    recent.push(chosen.name)
    while (recent.length > Math.max(clips.length - 1, 1)) recent.shift()
    try {
      sessionStorage.setItem(recentKey, JSON.stringify(recent))
    } catch (error) {
      /* private mode: rotation degrades to plain random */
    }
    return chosen
  }

  function style() {
    return [
      '.dshba{position:fixed;inset:0;z-index:2147483647;overflow:hidden;',
      'background:radial-gradient(circle at 50% 42%,#0b1b2e 0%,#050b14 62%,#000 100%);',
      'font-family:system-ui,-apple-system,Segoe UI,Microsoft YaHei,sans-serif;',
      'color:#dbeaf7;cursor:pointer;-webkit-user-select:none;user-select:none;',
      // The whole overlay fades as a unit: the app underneath must not be veiled
      // by anything once the exit starts, so the background gradient fades along
      // with the clip instead of outlasting it.
      'transition:opacity ' + (FADE_MS / 1000) + 's ease;opacity:1}',
      '.dshba[data-state=leaving]{opacity:0;pointer-events:none}',
      // `cover`, because letterboxing reads as black bars and was rejected. The
      // mask feathers the crop so it does not end in a hard edge.
      '.dshba-video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;',
      'opacity:0;transition:opacity 1.1s ease;',
      '-webkit-mask-image:radial-gradient(ellipse 88% 82% at 50% 50%,#000 62%,transparent 100%);',
      'mask-image:radial-gradient(ellipse 88% 82% at 50% 50%,#000 62%,transparent 100%)}',
      // Quoted for the same reason as the hint switch below: `[data-shown=1]` is
      // an invalid selector and the rule never applied.
      '.dshba-video[data-shown="1"]{opacity:1}',
      '.dshba-veil{position:absolute;inset:0;pointer-events:none;',
      'background:radial-gradient(ellipse 86% 78% at 50% 50%,transparent 44%,rgba(4,10,18,.45) 78%,rgba(2,6,12,.7) 100%)}',
      '.dshba-ui{position:absolute;left:0;right:0;bottom:0;padding:26px 30px 24px;',
      'display:flex;flex-direction:column;gap:9px;align-items:center;',
      'text-shadow:0 1px 10px rgba(0,0,0,.6)}',
      '.dshba-title{font-size:12px;letter-spacing:.34em;font-weight:600;color:' + BRAND_ACCENT + ';',
      'text-transform:uppercase;opacity:.92}',
      '.dshba-bar{position:relative;width:min(340px,54vw);height:2px;border-radius:2px;',
      'background:rgba(159,196,230,.22);overflow:hidden}',
      '.dshba-fill{position:absolute;inset:0 auto 0 0;width:0%;border-radius:2px;',
      'background:linear-gradient(90deg,#4f9dd9,#8fd8ff);',
      'box-shadow:0 0 12px rgba(143,216,255,.75);transition:width .45s ease}',
      '.dshba-hint{font-size:12px;color:#8fb3d4;letter-spacing:.12em;opacity:0;',
      'transition:opacity .5s ease}',
      // The switch only removes the sentence. `display:none` rather than
      // `opacity:0` so the line cannot be revealed later by the state rules
      // below, which set the opacity this class would otherwise fight.
      //
      // The value is QUOTED. An unquoted `0` is not an identifier, so
      // `[data-hint=0]` is an invalid selector, Chrome drops the whole rule, and
      // the switch silently does nothing. The attention rules below carried the
      // same bug with `[data-attention=1]` and had never applied.
      '.dshba[data-hint="0"] .dshba-hint{display:none}',
      '.dshba[data-state=ready] .dshba-hint{opacity:.95}',
      '.dshba[data-attention="1"] .dshba-hint{opacity:1;color:#ffd79a;letter-spacing:.04em}',
      '.dshba[data-attention="1"] .dshba-fill{background:linear-gradient(90deg,#d99a4f,#ffd79a)}',
      '.dshba-sound{position:absolute;right:22px;bottom:22px;z-index:2;cursor:pointer;',
      // A glyph, so the control is a fixed circle instead of a pill sized by its
      // own wording: the emoji is the whole face of the button.
      'width:38px;height:38px;display:flex;align-items:center;justify-content:center;',
      'font-size:16px;line-height:1;padding:0;border-radius:999px;',
      'color:#cfe4f6;background:rgba(12,26,42,.62);border:1px solid rgba(159,196,230,.38);',
      'backdrop-filter:blur(4px);transition:opacity .4s ease,background .2s ease}',
      '.dshba-sound:hover{background:rgba(20,44,70,.78)}',
      '.dshba[data-state=leaving] .dshba-sound{opacity:0;pointer-events:none}',
    ].join('')
  }

  function build() {
    // A new preview owns the voice; old gesture listeners must not survive it.
    if (typeof welcomeCleanup === 'function') welcomeCleanup()
    welcomeCleanup = null
    var css = document.createElement('style')
    css.setAttribute('data-dsh-boot-anim', '')
    css.textContent = style()
    var root = document.createElement('div')
    root.className = 'dshba'
    root.setAttribute('role', 'dialog')
    root.setAttribute('aria-label', 'DSH boot animation')
    root.setAttribute('data-state', 'idle')
    root.setAttribute('data-hint', SHOW_HINT ? '1' : '0')
    var video = document.createElement('video')
    video.className = 'dshba-video'
    video.muted = true
    // Looping only in `click` mode. The other two modes are driven by the clip's
    // own end, and a looping element never fires `ended` — with `loop` on, the
    // automatic hand-off would simply never happen.
    video.loop = ENTER_MODE === 'click'
    video.playsInline = true
    video.setAttribute('playsinline', '')
    video.preload = 'auto'

    // 固定片尾欢迎音：独立音轨，换任何视频都会响
    var CLIPS_WITH_OWN_SOUND = { '1.mp4': 1 }
    function clipHasOwnSound() {
      try {
        var src = String(video.currentSrc || video.src || '')
        var name = src.split('?')[0].split('/').pop()
        if (CLIPS_WITH_OWN_SOUND[name]) return true
      } catch (error) {}
      return false
    }
    var welcomeAudio = null
    var welcomePlayed = false
    var welcomeStarting = false
    var welcomeDisposed = false
    var welcomePending = false
    function ensureWelcomeAudio() {
      if (welcomeDisposed || !WELCOME_ENABLED) return null
      if (welcomeAudio || !WELCOME_SRC) return welcomeAudio
      try {
        welcomeAudio = new Audio(WELCOME_SRC)
        welcomeAudio.preload = 'auto'
        welcomeAudio.volume = WELCOME_VOLUME
        try { welcomeAudio.load() } catch (error) {}
      } catch (error) { welcomeAudio = null }
      return welcomeAudio
    }
    ensureWelcomeAudio()
    function playWelcome() {
      if (welcomeDisposed || welcomeStarting || welcomePlayed || !SOUND_ON || !WELCOME_ENABLED || !WELCOME_SRC) return false
      if (clipHasOwnSound()) return false
      try {
        ensureWelcomeAudio()
        if (!welcomeAudio) return false
        // Lock before play(): gesture, tail and entry can run in one event turn.
        welcomeStarting = true
        welcomeAudio.currentTime = 0
        var attempt = welcomeAudio.play()
        if (attempt && attempt.catch) {
          attempt.then(function () {
            welcomeStarting = false
            if (welcomeDisposed) return
            welcomePlayed = true
            welcomePending = false
          }).catch(function () {
            welcomeStarting = false
            if (!welcomeDisposed) welcomePending = true
          })
        } else { welcomeStarting = false; welcomePlayed = true }
        return true
      } catch (error) {
        welcomeStarting = false
        if (!welcomeDisposed) welcomePending = true
        return false
      }
    }
    function retryWelcome() {
      if (!welcomePending || welcomePlayed) return
      playWelcome()
    }
    window.addEventListener('pointerdown', retryWelcome, true)
    window.addEventListener('keydown', retryWelcome, true)
    welcomeCleanup = function () {
      welcomeDisposed = true
      welcomeStarting = false
      welcomePending = false
      window.removeEventListener('pointerdown', retryWelcome, true)
      window.removeEventListener('keydown', retryWelcome, true)
      if (welcomeAudio) { try { welcomeAudio.pause() } catch (error) {} }
      if (welcomeHook === playWelcome) welcomeHook = null
    }
    video.addEventListener('timeupdate', function () {
      var total = video.duration
      if (!isFinite(total) || total <= 0) return
      if (video.currentTime >= total - WELCOME_LEAD_S) playWelcome()
    })
    video.addEventListener('ended', playWelcome)
    welcomeHook = playWelcome
    var veil = document.createElement('div')
    veil.className = 'dshba-veil'
    var ui = document.createElement('div')
    ui.className = 'dshba-ui'
    var title = document.createElement('div')
    title.className = 'dshba-title'
    title.textContent = BRAND_TITLE
    var bar = document.createElement('div')
    bar.className = 'dshba-bar'
    var fill = document.createElement('div')
    fill.className = 'dshba-fill'
    bar.appendChild(fill)
    var hint = document.createElement('div')
    hint.className = 'dshba-hint'
    hint.textContent = ''
    // A sound toggle, deliberately separate from the enter gesture. Chromium only
    // grants audio to a user gesture, and entering is one — but entering also
    // dismisses the screen, so tying sound to it means the sound is only ever
    // heard on the way out. This button is the gesture that turns sound on while
    // the screen stays put, and once the origin has that engagement recorded the
    // clip starts with sound on later launches with no interaction at all.
    //
    // With sound off there is no button at all, because there is nothing it could
    // be allowed to do: a control that only ever fails is worse than no control.
    var sound = null
    if (SOUND_ON) {
      sound = document.createElement('button')
      sound.className = 'dshba-sound'
      sound.type = 'button'
      // No clip has been started yet, so the button's first state is the silent
      // one. Every later write goes through renderSound, which derives the glyph
      // from the audio state rather than from the click that caused it; the name
      // and the tooltip carry the words, and neither changes with the state.
      sound.textContent = SOUND_TEXT_OFF
      sound.title = SOUND_HINT_OFF
      sound.setAttribute('aria-label', SOUND_NAME)
      sound.addEventListener('pointerdown', function (event) { event.stopPropagation() }, true)
      sound.addEventListener('click', function (event) {
        event.preventDefault()
        event.stopPropagation()
        toggleSound()
      })
    }
    ui.appendChild(title)
    ui.appendChild(bar)
    ui.appendChild(hint)
    root.appendChild(video)
    root.appendChild(veil)
    if (sound) root.appendChild(sound)
    root.appendChild(ui)
    // The video part is a live view, not a snapshot: a clip that fails to play is
    // replaced by a fresh element, so anything holding the old node would pause
    // the wrong element on exit.
    return {
      css: css,
      root: root,
      fill: fill,
      hint: hint,
      ui: ui,
      veil: veil,
      sound: sound,
      video: function () { return video },
      replaceVideo: function (next) { video = next },
    }
  }

  // The kernel boot page is created synchronously after this script, so every
  // observation below is attached before its first mutation.
  var parts = build()
  var namespace = {
    el: parts.root,
    bootedAt: null,
    failed: false,
    // `null` means audio is fine (or was never in question); anything else is the
    // reason the clip is silent. Sound is off from the first frame when the
    // setting says so, so the hint never advertises an unlock that cannot happen.
    audioBlocked: SOUND_ON ? null : 'disabled',
    // Called by the browser half once the client roster activates. Boot has then
    // finished, so the screen may announce that entering is available — and if
    // the clip already played itself out while the kernel was still starting,
    // this is the moment the hand-off that was waiting on it can happen.
    clientReady: function () {
      if (namespace.bootedAt === null) namespace.bootedAt = Date.now()
      if (namespace.failed) return
      setState('ready')
      parts.hint.textContent = namespace.audioBlocked === null ? HINT_SOUND : HINT_SILENT
      // If the clip is already inside its final window the dissolve starts here,
      // rather than on whatever the next frame happens to be.
      if (typeof nudgeTail === 'function') nudgeTail()
      maybeEnter()
    },
  }
  globalThis.__DSH_BOOT_ANIM__ = namespace

  // The sound button is drawn from the audio state, never from the click that
  // changed it: every path that makes the clip audible or silent goes through
  // setAudioBlocked, so there is one writer and no path can leave the label
  // behind. That is the whole fix for a button that showed the muted glyph while
  // the clip was playing.
  /**
   * Repaint the sound button from the state of the clip.
   *
   * `namespace.audioBlocked` is the recorded reason the clip is silent (`null`
   * when it is allowed to be heard) and the element's own `muted` flag is the half
   * a listener can check with their ears. Deriving the glyph from both is what
   * keeps a muted icon off a playing clip: the unmuted start attempt and the retry
   * a press fires make the clip audible without a click handler of their own, and
   * both used to leave the initial label on screen while the sound was already
   * running — most visibly in the desktop app, where autoplay with sound needs no
   * user gesture at all.
   *
   * @param hint - tooltip to show instead of the default action, for a state with
   *   something more specific to say than "press to start it".
   */
  function renderSound(hint) {
    if (!parts.sound) return
    var audible = !parts.video().muted && namespace.audioBlocked === null
    parts.sound.textContent = audible ? SOUND_TEXT_ON : SOUND_TEXT_OFF
    // The glyph carries the state at a glance and the words stay available on
    // hover, so nothing is lost by keeping them off the button face.
    parts.sound.title = hint || (audible ? SOUND_HINT_ON : SOUND_HINT_OFF)
    // The control is a toggle, so its pressed state is the same fact the glyph
    // shows: a screen reader must not be told the clip is silent while it plays.
    parts.sound.setAttribute('aria-pressed', audible ? 'true' : 'false')
  }

  /**
   * Record why the clip is silent — or that it is not — and repaint the button.
   * @param reason - `null` when the clip may be heard, otherwise the reason the
   *   diagnostics line reports.
   * @param hint - optional tooltip for renderSound.
   */
  function setAudioBlocked(reason, hint) {
    namespace.audioBlocked = reason
    renderSound(hint)
  }

  /**
   * Preview state: non-null only while a preview is on screen.
   *
   * The boot path never sets it, so every branch below that reads it is the same
   * code path it always was for a real start.
   */
  var previewName = null
  var previewDone = null

  /**
   * Adopt the settings a preview was asked for.
   *
   * Each of these is a `var` that the machinery below reads at call time, so
   * reassigning is enough — but it MUST happen before `build()`, because the hint
   * line, the sound button, the loop flag and the stylesheet's default fade are all
   * decided there.
   * @param options - the settings the card currently shows.
   */
  function applyPreviewSettings(options) {
    if (typeof options.fadeMs === 'number' && options.fadeMs >= 300 && options.fadeMs <= 5000) {
      FADE_MS = Math.round(options.fadeMs)
    }
    TAIL_MIN_MS = FADE_MS * 2
    if (options.enterMode === 'tail' || options.enterMode === 'end' || options.enterMode === 'click') {
      ENTER_MODE = options.enterMode
    }
    SOUND_ON = options.sound !== false
    WELCOME_ENABLED = options.welcomeEnabled !== false
    CLICK_TO_ENTER = false
    SHOW_HINT = options.showHint !== false
    computeHints()
  }

  /**
   * Run the real overlay once, now, on an already-booted page, for one named clip.
   *
   * The settings card's 预览 button is the only caller, and three things make this
   * the same screen rather than an imitation of it:
   *
   *   - the overlay is REBUILT from the settings the card currently shows, so the
   *     hint line, the sound button and the fade are the ones that would really
   *     apply (the DOM built at page load was decided by the values that page was
   *     served with);
   *   - the clip is the named one instead of a random pick, and the rotation
   *     history in sessionStorage is deliberately left alone;
   *   - the exit is the same `enter()` the boot path uses, so the dissolve, the
   *     sound retry, the detached-clip handling and the caption hand-back are all
   *     the real ones. No kernel boot page is involved, so the progress bar is
   *     simply filled.
   *
   * @param options - `{ name, fadeMs, enterMode, sound, welcomeEnabled, clickToEnter, showHint, onDone }`.
   * @returns true when a preview started, false when one is already running or the
   *   request is malformed.
   */
  namespace.preview = function (options) {
    if (typeof options !== 'object' || options === null) return false
    if (typeof options.name !== 'string' || options.name === '') return false
    if (previewName !== null) return false

    applyPreviewSettings(options)
    parts = build()
    namespace.el = parts.root
    wireRoot(parts.root)
    previewName = options.name
    previewDone = typeof options.onDone === 'function' ? options.onDone : null

    // Every piece of run state the first pass left behind. Missing any one of them
    // surfaces as a preview that cannot be entered (`entered`), never hands over
    // (`clipDone`), or plays nothing at all (`cache.loaded`).
    entered = false
    clipDone = false
    nudgeTail = null
    audioRetry = null
    cache = { startedAt: Date.now(), current: null, loaded: false }
    namespace.failed = false
    namespace.failures = []
    namespace.audioBlocked = SOUND_ON ? null : 'disabled'
    namespace.clipEndedAt = null
    namespace.unknownLength = false
    namespace.lastStall = null
    namespace.tailEntered = false
    // The caption probe is restyled for the preview and handed back on the way out,
    // so these flags are cleared rather than carried over as "already restored".
    captionDone = false
    captionStyle = null
    // A preview has no kernel boot page to wait for and the shell is by definition
    // already up: this is what makes the hand-off possible without a clientReady
    // call that nobody is going to make a second time.
    namespace.bootedAt = Date.now()

    mount()
    return true
  }

  // The hints, one per state the screen can actually be in: while the clip is
  // silent the first press means "let me hear it", once sound is on a press means
  // "skip the rest", and in click mode a press is the only way in at all. Saying
  // so removes the guesswork about why nothing happened on the first click.
  //
  // Derived in a function rather than at declaration because a PREVIEW can change
  // every setting this depends on and then rebuild the overlay: the strings have to
  // be recomputed for the settings the preview was asked for, not the ones this
  // page was served with.
  var HINT_ENTER, HINT_UNLOCK, HINT_DIRECT, TWO_STEP, HINT_SOUND, HINT_SILENT

  function computeHints() {
    HINT_ENTER = ENTER_MODE === 'click' ? '点击进入' : '播完自动进入 · 点一下提前进'
    HINT_UNLOCK = ENTER_MODE === 'click' ? '点一下开声音 · 再点进入' : '点一下开声音 · 播完自动进入'
    HINT_DIRECT = ENTER_MODE === 'click' ? '点击进入' : '点一下直接进入'
    TWO_STEP = SOUND_ON && !CLICK_TO_ENTER
    // With sound off there is nothing to unlock, so the plain entry hint is the
    // true one; with click-to-enter the press skips audio, and the hint says that.
    HINT_SOUND = CLICK_TO_ENTER ? HINT_DIRECT : HINT_ENTER
    HINT_SILENT = TWO_STEP ? HINT_UNLOCK : HINT_SOUND
  }

  computeHints()

  function setState(value) {
    parts.root.setAttribute('data-state', value)
  }

  function attention(message) {
    parts.root.setAttribute('data-attention', '1')
    setState('ready')
    parts.hint.textContent = message
  }

  /** Drive the bar from the kernel's own progress arc. */
  function observeProgress() {
    var boot = document.querySelector('[data-dsh-boot]')
    if (boot === null) return
    var spinner = boot.querySelector('[data-dsh-boot-spinner]')
    if (spinner === null) return
    var update = function () {
      var raw = parseFloat(spinner.style.getPropertyValue('--dsh-boot-arc'))
      var ratio = Number.isFinite(raw) ? Math.min(Math.max((raw - ARC_MIN) / ARC_SPAN, 0), 1) : 0
      parts.fill.style.width = (ratio * 100).toFixed(1) + '%'
    }
    update()
    new MutationObserver(update).observe(spinner, { attributes: true, attributeFilter: ['style'] })
  }

  /**
   * Detect the kernel's failure rendering. The kernel replaces the boot card's
   * children with a failure report and never mounts the application, so without
   * this the screen would hold the viewport forever and hide the diagnosis.
   */
  function observeFailure() {
    var boot = document.querySelector('[data-dsh-boot]')
    if (boot === null) return
    var check = function () {
      if (namespace.failed) return
      var text = boot.textContent || ''
      if (text.indexOf('Failed to load plugins') < 0 && text.indexOf('did not activate') < 0) return
      namespace.failed = true
      attention('启动失败，点击查看')
    }
    new MutationObserver(check).observe(boot, { childList: true, subtree: true, characterData: true })
    check()
  }

  // Set by the clip loader once a clip is playing silently; called by the
  // entering gesture to retry with sound. Declared here because the entering
  // handler is defined outside the loader's scope.
  var audioRetry = null

  // Whether the clip has played itself out. Together with `bootedAt` this is the
  // whole hand-off condition: the animation runs to its end, and the app is shown
  // when both the clip is over and the kernel is actually ready.
  var clipDone = false

  // The stall watchdog's handle, kept out here so `enter()` can stop it on every
  // exit path rather than only the ones that happen to remember.
  var stallWatch = null
  var lastProgress = 0

  function stopStallWatch() {
    if (stallWatch === null) return
    globalThis.clearInterval(stallWatch)
    stallWatch = null
  }

  // Set by the loader to the current clip's tail check.
  //
  // There is a genuine gap without it: if the kernel becomes ready while the clip
  // is inside its final window, the dissolve should begin right then — but the
  // frame loop may not tick again for a frame, and in a background tab rAF is
  // throttled hard enough to miss it until the clip is already over. Boot
  // readiness is a moment we know exactly, so it pushes instead of waiting to be
  // polled.
  var nudgeTail = null

  /**
   * Hand off to the app if — and only if — the clip is over AND boot finished.
   *
   * The order of those two is why this is a function rather than a listener on
   * `ended`: whichever of them happens second has to be the one that lets go, and
   * a clip that ends during a slow start must not reveal a half-built app. When
   * the clip finishes first the last frame is simply held; `clientReady` calls
   * back here the moment the kernel catches up.
   */
  function maybeEnter() {
    // In `click` mode the clip is the whole show and the user decides when it
    // ends; nothing about the clip or the kernel releases the screen but a press.
    if (ENTER_MODE === 'click') return
    if (!clipDone || namespace.failed) return
    if (namespace.bootedAt === null) {
      // Deliberately not the amber attention state: nothing is wrong yet, and
      // flashing the warning for an ordinary slow start would cry wolf on a
      // condition that resolves itself. The amber hint is saved for a real stall.
      parts.hint.textContent = '启动较慢，就绪后自动进入'
      return
    }
    enter()
  }

  /**
   * Turn sound on for the clip that is already playing, without leaving the
   * screen. This click is the user activation the audio policy wants, so it
   * succeeds where the initial muted-then-unmuted attempt could not.
   */
  function toggleSound() {
    // Nothing to toggle when the option is off; the button is not even built.
    if (!SOUND_ON) return
    var video = parts.video()
    if (!video.muted) {
      video.muted = true
      setAudioBlocked('muted-by-user')
      return
    }
    video.muted = false
    setAudioBlocked(null)
    var played = video.play()
    if (played && typeof played.catch === 'function') {
      played.catch(function (reason) {
        video.muted = true
        // The element is muted again, so the tooltip is what says this press was
        // refused rather than merely silent.
        setAudioBlocked(reason && reason.name ? reason.name : 'refused', SOUND_HINT_REFUSED)
        var retryMuted = video.play()
        if (retryMuted && typeof retryMuted.catch === 'function') retryMuted.catch(function () {})
      })
    }
  }

  /**
   * Call back once the clip has a frame to show — starting it is not that moment.
   *
   * A resolved `play()` promise only means the element left the paused state. It
   * says nothing about whether a picture exists, and treating it as success
   * disarmed the retry watchdog, so a clip whose frames never arrived left the
   * screen on the bare gradient with no error and no further attempt.
   *
   * Nor may this wait for a frame to be COMPOSITED, which was the first attempt at
   * fixing that and locked the screen up instead: the element starts fully
   * transparent and this callback is what makes it visible, so
   * `requestVideoFrameCallback` can sit waiting for a frame that will not be
   * submitted until the very style change it is blocking. The signal is *decoded
   * data for the first frame*, from whichever report arrives first, with a
   * presented frame kept as one more route to the same fact.
   * @param video - the clip element.
   * @param done - called once the clip can show something.
   */
  function whenFramePresents(video, done) {
    var fired = false
    var once = function () {
      if (fired) return
      fired = true
      done()
    }
    // "Data for the current playback position is available", which for a fresh
    // element is the first frame.
    if (video.readyState >= 2) {
      once()
      return
    }
    video.addEventListener('loadeddata', once, { once: true })
    video.addEventListener('canplay', once, { once: true })
    if (typeof video.requestVideoFrameCallback === 'function') {
      video.requestVideoFrameCallback(once)
    }
    // Advancing time is the same fact reported by none of the above, and it is the
    // case a MediaRecorder WebM can land in: it may never report `readyState >= 2`
    // and yet be playing frames.
    video.addEventListener('timeupdate', function () {
      if (video.currentTime > 0) once()
    })
  }

  /**
   * Take the clip's own audio to silence over the exit.
   *
   * The picture has always dissolved into the app; the sound did not follow it.
   * A skipped clip was detached and kept playing at full level while the app was
   * already up, and the tail dissolve ended its picture with the track still at
   * full gain. Both are the same missing piece, so one ramp covers every exit.
   *
   * Its duration is the exit's own span — which is what makes the sound and the
   * picture reach their end on the same frame — plus the grace a detached clip is
   * allowed after the overlay is gone (`span + AUDIO_GRACE_MS`, computed by the
   * caller). A fixed duration here would drift away from a tail dissolve, whose
   * span is the clip's remaining time rather than FADE_MS.
   *
   * Linear gain, not an equal-power curve: this is a fade to silence over one or
   * two seconds, where the straight amplitude ramp is what sounds like the
   * picture fading; an equal-power shape would only hold the last moment louder.
   *
   * Both a frame loop and a deadline are needed. rAF is what makes it smooth
   * while the tab is visible, and it also stops when the tab is not — while the
   * exit's own timers keep running. The deadline is therefore what guarantees
   * silence at the end of the exit no matter what the compositor did.
   * @param video - the clip whose audio is playing.
   * @param span - the ramp duration in ms: the exit's span, and for a detached
   *   clip that same span plus AUDIO_GRACE_MS.
   */
  function fadeOutClipAudio(video, span) {
    var from = video.volume
    // Nothing to take down: a muted element is already silent, and a volume that
    // is not a positive number (some environments report NaN before metadata) has
    // no level to ramp from.
    if (video.muted || !(from > 0)) return
    var startedAt = Date.now()
    var done = false
    var silence = function () {
      if (done) return
      done = true
      video.volume = 0
    }
    var step = function () {
      if (done) return
      var progress = (Date.now() - startedAt) / span
      if (progress >= 1) {
        silence()
        return
      }
      video.volume = from * (1 - progress)
      nextFrame(step)
    }
    step()
    globalThis.setTimeout(silence, span)
  }

  /**
   * Dissolve the overlay away and hand the app over.
   *
   * The duration below is also the audio's: the clip's own track is ramped to
   * silence over that same span by fadeOutClipAudio, so the sound stops exactly
   * when the picture it belonged to does.
   *
   * @param fadeMs - how long the dissolve takes. The tail dissolve passes the
   *   clip's actual remaining time so the fade lands exactly on the last frame
   *   instead of a fixed guess; everything else passes nothing and gets FADE_MS.
   * @param tail - true when the clip is still playing and will reach its own end
   *   during the dissolve. The clip then STAYS inside the overlay and fades with
   *   it, which is the whole effect: the picture dissolves into the app and the
   *   last frame is gone exactly when the clip is. Detaching it to `body` here —
   *   as a skip does — would park an opaque video on top of the app for the whole
   *   dissolve and erase the crossfade.
   */
  function enter(fadeMs, tail) {
    if (parts.root.getAttribute('data-state') === 'leaving') return
    entered = true
    stopStallWatch()
    if (typeof welcomeHook === 'function') { try { welcomeHook() } catch (error) {} }

    var span = typeof fadeMs === 'number' && fadeMs > 0
      ? Math.max(Math.min(fadeMs, FADE_MS), 120)
      : FADE_MS

    var video = parts.video()
    // A clip that has already reached its end must not be replayed on the way
    // out. The sound retry calls play() again, and play() on a finished element
    // seeks back to zero and starts the whole thing over — so the hand-off at the
    // end of a clip would restart the animation underneath the fade. The retry is
    // only meaningful while there are still frames left to hear it over.
    var finished = video.ended === true
    var live = !finished && !video.paused && tail !== true
    // The retry that lets a skip carry the sound out with the picture. Not with
    // click-to-enter: there the press is only ever the entry, and turning audio on
    // as a side effect of leaving is exactly the second meaning the option removes.
    if (!CLICK_TO_ENTER && !finished && tail !== true && typeof audioRetry === 'function') audioRetry()

    // A clip that is still RUNNING and is being skipped past is moved out of the
    // overlay before the overlay goes away. Two reasons, both required: removing
    // the overlay removes a <video> inside it, and an element cut out of the
    // document mid-ramp is the very hard stop this fade exists to remove; and the
    // overlay must not keep painting over the app while it exits. Detached, the
    // element plays its ramp out with nothing on screen. A clip that already ended
    // has no audio left to fade, so it simply goes out with everything else.
    var standalone = false
    if (live && video.parentNode && video.parentNode.parentNode === document.body) {
      var box = video.getBoundingClientRect()
      video.style.position = 'fixed'
      video.style.left = box.left + 'px'
      video.style.top = box.top + 'px'
      video.style.width = box.width + 'px'
      video.style.height = box.height + 'px'
      video.style.transition = 'opacity ' + (span / 2 / 1000) + 's ease'
      video.style.pointerEvents = 'none'
      document.body.appendChild(video)
      standalone = true
    }

    // The sound leaves with the picture, over the same span the picture takes —
    // plus, when the clip is detached above and therefore still has track left,
    // the grace it has always been allowed after the overlay is gone. That window
    // used to be played at full level and cut at the end of it; it is now spent
    // fading, so the ramp covers `span + AUDIO_GRACE_MS` and reaches zero exactly
    // where the element is stopped. A tail dissolve adds nothing: its clip ends by
    // itself at the end of `span`, so `span` is where its sound has to be gone.
    // Started after the detach, because removing the overlay is what would cut the
    // ramp short.
    if (!finished) fadeOutClipAudio(video, standalone ? span + AUDIO_GRACE_MS : span)

    // The WHOLE overlay fades as a unit — background gradient, clip and chrome
    // together — and is then removed. Fading only the chrome first, as an earlier
    // version did, left an opaque panel covering the conversation underneath for
    // the rest of the transition. Nothing here outlives the fade, so the app is
    // never left covered.
    //
    // The duration is set inline rather than left to the stylesheet because a tail
    // dissolve knows the exact time it has left; the CSS value is only the default
    // for the fades that have no deadline to hit.
    parts.root.style.transitionDuration = (span / 1000) + 's'
    setState('leaving')
    globalThis.setTimeout(function () {
      if (parts.root.parentNode) parts.root.parentNode.removeChild(parts.root)
      // A preview's overlay is a REBUILT one and owns its own stylesheet; the boot
      // pass's sheet is left alone, since it is what carries the rules the shell may
      // still be dissolving against.
      if (previewName !== null && parts.css.parentNode) parts.css.parentNode.removeChild(parts.css)
      // Handed back here rather than when the fade starts: a transparent caption
      // stays correct for the whole dissolve — it shows whatever is behind it, which
      // is exactly what is fading — whereas an opaque one would flip to the shell's
      // colours while the sea is still on screen.
      restoreCaptionTokens()
      // Release the preview last, so the card's button cannot offer a second one
      // while this overlay is still dissolving.
      if (previewName !== null) {
        previewName = null
        var announce = previewDone
        previewDone = null
        if (typeof announce === 'function') {
          try {
            announce()
          } catch (error) {
            /* the card that asked for this may already be unmounted */
          }
        }
      }
    }, span + 100)

    if (standalone) {
      // The detached clip keeps its own picture for the first half of the exit and
      // loses it over the second, then is stopped at the end of its grace — the
      // same deadline it always had. What changed is that the ramp has taken it to
      // silence by then, so this pause is cleanup rather than the cut. The ramp's
      // own deadline was scheduled first, so it wins the tie and runs first.
      globalThis.setTimeout(function () { video.style.opacity = '0' }, span / 2)
      globalThis.setTimeout(function () {
        try {
          video.pause()
        } catch (error) {
          /* already stopped */
        }
        if (video.parentNode) video.parentNode.removeChild(video)
      }, span + AUDIO_GRACE_MS)
    } else {
      // A tail dissolve's clip is over by the end of `span` (the ramp is exactly
      // that long), so the pause lands just after the ramp and the clip's own end.
      globalThis.setTimeout(function () {
        try {
          video.pause()
        } catch (error) {
          /* an unplayed video needs no pause */
        }
      }, span + 150)
    }
  }

  // One press, two possible meanings, decided by the audio policy rather than by
  // a counter.
  //
  // Chromium grants audio only to a user gesture, and the gesture must NOT be the
  // one that dismisses the screen — otherwise the sound starts exactly as the
  // picture leaves, which is the contradiction of "click to hear it" plus "click
  // to leave". So while the clip is still silent a press unlocks the sound and
  // deliberately leaves the screen alone; once sound is on (or was never blocked)
  // a press means "skip the rest of it". The entry itself no longer needs a
  // press at all: the clip playing out is what enters. Any key enters directly —
  // a user reaching for Esc does not want a two-step.
  var entered = false

  function press() {
    if (entered) return
    // A clip that has already finished is never a sound-unlock target: the retry
    // path calls play(), and play() on a finished element restarts it from zero.
    // That case is reachable — the clip can end while the kernel is still
    // starting — and pressing then means "let me in", not "replay that".
    var finished = parts.video().ended === true
    // Click-to-enter skips the unlock: this press IS the entry, so there is no
    // first press spent on audio and no second press needed. With sound off the
    // condition below is already false (no audioRetry was ever armed), and this
    // flag is what makes the same shortcut explicit.
    if (!CLICK_TO_ENTER && !finished && namespace.audioBlocked !== null && typeof audioRetry === 'function') {
      // This press is the user activation the retry wants, so the clip is on its
      // way to being audible and both the reason and the button say so here. The
      // order matters: the optimistic write comes first and the retry's own
      // refusal puts the reason back, so a policy that still says no cannot end up
      // with a button claiming sound that never started.
      setAudioBlocked(null)
      audioRetry()
      if (!namespace.failed) parts.hint.textContent = HINT_SOUND
      return
    }
    var welcomeStarted = false
    if (typeof welcomeHook === 'function') {
      try { welcomeStarted = welcomeHook() === true } catch (error) { welcomeStarted = false }
    }
    if (welcomeStarted) { window.setTimeout(enter, ENTER_AFTER_WELCOME_MS); return }
    enter()
  }

  /**
   * Whether a pointer event landed on the sound control.
   *
   * The overlay listens on pointerdown in the capture phase, which runs before
   * the button's own handlers and before any click, so a button that only stopped
   * propagation on click was never reached — pressing it entered the screen. The
   * check has to be on the event target instead of on propagation order.
   * @param event - the pointer event.
   * @returns true when the press belongs to the sound control.
   */
  function onSoundControl(event) {
    var node = event && event.target
    return !!(node && node.closest && node.closest('.dshba-sound'))
  }

  /**
   * Wire one overlay root to the enter gesture.
   *
   * A function rather than a bare statement because a PREVIEW rebuilds the overlay
   * — the hint line and the sound button are decided at build time from the
   * settings, so a preview of a differently-configured screen needs a fresh DOM —
   * and a rebuilt root would otherwise have no pointer handler at all.
   * @param root - the overlay root to listen on.
   */
  function wireRoot(root) {
    root.addEventListener('pointerdown', function (event) {
      if (onSoundControl(event)) return
      press()
    }, true)
  }

  wireRoot(parts.root)
  globalThis.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' || event.key === ' ' || event.key === 'Enter') {
      entered = true
      enter()
    }
  })

  // The hold budget covers the case the kernel never settles: without it a boot
  // that neither activates the roster nor renders a failure report would trap
  // the user on a decorative screen.
  globalThis.setTimeout(function () {
    if (parts.root.getAttribute('data-state') === 'leaving') return
    if (namespace.bootedAt !== null) return
    attention('启动较慢，点击继续')
  }, HOLD_MS)

  // `?dshbootdiag=1` turns the hint line into a live readout of the clip and the
  // audio-policy outcome. Reported from the page itself so a stuck screen can be
  // diagnosed from a screenshot instead of a description: the fields say whether
  // frames are flowing, whether sound was allowed, and why not.
  function startDiagnostics() {
    if (globalThis.location.search.indexOf('dshbootdiag=1') < 0) return
    setInterval(function () {
      if (parts.root.getAttribute('data-state') === 'leaving') return
      var video = parts.video()
      var text = 'diag shown=' + (video.getAttribute('data-shown') || '-')
        + ' rs=' + video.readyState
        + ' muted=' + video.muted
        + ' t=' + (video.currentTime || 0).toFixed(1)
        + ' dur=' + (Number.isFinite(video.duration) ? video.duration.toFixed(1) : '?')
        + ' paused=' + video.paused
        + ' ended=' + video.ended
        + ' done=' + (clipDone ? 1 : 0)
        + ' boot=' + (namespace.bootedAt === null ? 0 : 1)
        + ' tail=' + (namespace.tailEntered ? 1 : 0)
        + ' clip=' + (cache.current ? cache.current.name : '-')
        + ' fail=' + (namespace.failures || '-')
        + ' fade=' + (FADE_MS / 1000) + 's'
        + ' stall=' + (namespace.lastStall ? Math.round((Date.now() - namespace.lastStall) / 1000) + 's ago' : '-')
        + ' err=' + (video.error ? video.error.code : '-')
        + ' audio=' + (namespace.audioBlocked === null ? 'ok' : namespace.audioBlocked)
      parts.hint.textContent = text
    }, 800)
  }

  /**
   * Repaint the Windows caption in this screen's colours.
   *
   * Appending to the head is the whole mechanism twice over: the rule restyles the
   * preload's probe, and the head mutation is what makes the preload measure again
   * and push the new colours to the caption.
   */
  function applyCaptionTokens() {
    if (captionDone || captionStyle) return
    captionStyle = document.createElement('style')
    captionStyle.setAttribute('data-dshba-caption', '')
    captionStyle.textContent = CAPTION_CSS
    document.head.appendChild(captionStyle)
  }

  /** Hand the caption back. Removing the rule is what makes the preload measure again. */
  function restoreCaptionTokens() {
    captionDone = true
    if (captionStyle && captionStyle.parentNode) captionStyle.parentNode.removeChild(captionStyle)
    captionStyle = null
  }

  function mount() {
    // A preview rebuilds `parts`, so its stylesheet is a new element; the boot
    // pass's own sheet holds identical rules and stays where it is — the preview's
    // is removed again on its way out.
    if (!parts.css.parentNode) document.head.appendChild(parts.css)
    ;(document.body || document.documentElement).appendChild(parts.root)
    applyCaptionTokens()
    if (previewName === null) {
      observeProgress()
      observeFailure()
    } else {
      // An already-booted shell has no kernel boot page, so there is no progress
      // arc to read: a bar stuck at zero would be the one visible lie on an
      // otherwise faithful preview.
      parts.fill.style.width = '100%'
    }
    startDiagnostics()

    // Everything below releases the hand-off, so every way this can stop must
    // release it too. Two of them did not, and both left the only way in as a
    // click on a screen that otherwise looked alive:
    //
    //   - the manifest never answering (a busy or hung request), so no clip is
    //     ever chosen and nothing ever ends;
    //   - a pool that is genuinely empty, which the early `return` below used to
    //     take silently.
    //
    // The pool is a decoration; being unable to list it is not a reason to hold
    // someone in front of it.
    var releaseWithoutClip = function (message) {
      if (cache.loaded || clipDone) return
      cache.loaded = true
      if (message && parts.root.getAttribute('data-state') !== 'leaving') {
        parts.hint.textContent = message
      }
      clipDone = true
      maybeEnter()
    }
    var manifestWindow = globalThis.setTimeout(function () {
      releaseWithoutClip('素材清单没有回应 · 就绪后自动进入')
    }, 10000)

    // Discover the pool, then play one clip. Loading is deferred until the
    // manifest answers so a page load without clips shows only the gradient.
    fetch(cfg.manifest, { cache: 'no-store' })
      .then(function (response) { return response.ok ? response.json() : { clips: [] } })
      .then(function (payload) {
        globalThis.clearTimeout(manifestWindow)
        var published = payload && Array.isArray(payload.clips) ? payload.clips : []
        // The pool the user curated in the settings card. Switching every clip off
        // would leave nothing to play and therefore nothing to trigger the
        // hand-off, so a filter that would empty the pool is dropped rather than
        // obeyed — the same fallback the Host keeps, repeated here because this
        // manifest is the only input this script has.
        var clips = published.filter(function (clip) { return clip.enabled !== false })
        if (clips.length === 0) clips = published
        if (clips.length === 0) {
          releaseWithoutClip('素材池是空的 · 就绪后自动进入')
          return
        }
        cache.loaded = true

        // Entering must be available from the first frame: a slow boot is exactly
        // when a user wants to know they can skip ahead.
        if (!namespace.failed) parts.hint.textContent = HINT_SOUND

        // Try clips until one really plays. A pool entry can fail for reasons
        // outside this plugin's control (an unsupported codec, a truncated
        // download), and one failure must not leave the screen on a bare gradient
        // while the pool still holds playable clips.
        var preferred
        if (previewName !== null) {
          // The named clip, looked up in the PUBLISHED list rather than the enabled
          // one: previewing a clip that is switched out of the rotation is exactly
          // what that row's button is for.
          for (var wanted = 0; wanted < published.length; wanted += 1) {
            if (published[wanted].name === previewName) { preferred = published[wanted]; break }
          }
          if (!preferred) {
            releaseWithoutClip('素材池里找不到这一段 · 点一下进入')
            return
          }
        } else {
          preferred = pickClip(clips)
        }
        // A preview plays that one clip or reports that it could not: falling back
        // to another clip would answer "what does this one look like" with a
        // different clip, which is worse than saying it did not play.
        var order = previewName !== null ? [preferred] : [preferred].concat(shuffled(clips).filter(function (clip) {
          return clip.name !== preferred.name
        }))

        var settled = false
        var attempt = 0
        // The retry lives in the outer scope so the entering gesture can reach it;
        // this flag records why the clip is silent, for the hint to report — and
        // it is also what the sound button is drawn from, so it is written through
        // the setter rather than assigned.
        setAudioBlocked(SOUND_ON ? null : 'disabled')

        /**
         * Start a clip. Sound first, muted only as the fallback.
         *
         * Chromium permits sound only with a user gesture, but it also counts
         * prior interaction with the origin (sticky activation) and its own media
         * engagement record, so an unmuted play() genuinely succeeds on a
         * regularly used origin. Trying muted first, as this screen used to, threw
         * that away: it silenced the clip on every machine, including the ones
         * where sound was already allowed.
         * @param video - the element to start.
         * @param onPlaying - called once frames are flowing.
         * @param onBlocked - called when neither unmuted nor muted playback starts.
         */
        function startClip(video, onPlaying, onBlocked) {
          var decided = false
          var settle = function (fn) { return function () { if (decided) return; decided = true; fn() } }
          var playing = settle(onPlaying)
          var blocked = settle(onBlocked)
          var attemptPlay = function (muted, onRefused) {
            video.muted = muted
            var played
            try {
              played = video.play()
            } catch (error) {
              onRefused()
              return
            }
            // The attempt resolving is the moment the button can be told the
            // truth: an unmuted start is what makes the clip audible, while a muted
            // fallback stays silent however it ended, so the reason — and the label
            // drawn from it — are left exactly as they were.
            var started = function () {
              if (muted) renderSound()
              else setAudioBlocked(null)
              playing()
            }
            if (played && typeof played.then === 'function') {
              played.then(started, onRefused)
              return
            }
            started()
          }
          var fallback = function () {
            setAudioBlocked('refused')
            audioRetry = function () {
              attemptPlay(false, function () {
                // Refused again, this time with a gesture behind it: the clip is
                // silent, so the element goes back to muted and the button goes
                // back to saying so instead of promising sound that is not there.
                video.muted = true
                setAudioBlocked('refused', SOUND_HINT_REFUSED)
              })
            }
            attemptPlay(true, blocked)
          }
          // Sound is off for good: skip the unmuted attempt and the retry entirely
          // rather than try them and have them refused. Muted autoplay is also the
          // one start the audio policy always permits, so this path cannot land in
          // `blocked` for a policy reason.
          if (!SOUND_ON) {
            setAudioBlocked('disabled')
            audioRetry = null
            attemptPlay(true, blocked)
            return
          }
          // The unmuted attempt may neither resolve nor reject on a slow or
          // conflicting load, and waiting on it forever is what leaves the screen
          // on a bare gradient. A short window bounds it; the muted retry always
          // starts because muted autoplay is what the policy permits.
          var soundWindow = globalThis.setTimeout(fallback, 1200)
          var settleWindow = function () { globalThis.clearTimeout(soundWindow) }
          // This attempt resolved unmuted: the clip is audible, and this is the one
          // fact the button is drawn from, so it is written before the reveal
          // callback gets to say anything about the clip.
          var unmutedPlaying = function () { settleWindow(); setAudioBlocked(null); playing() }
          var unmutedRefused = function () { settleWindow(); fallback() }
          video.muted = false
          var played
          try {
            played = video.play()
          } catch (error) {
            played = undefined
          }
          if (played && typeof played.then === 'function') played.then(unmutedPlaying, unmutedRefused)
          else if (played === undefined) unmutedRefused()
          else unmutedPlaying()
        }

        // Which clips failed and why, so a stuck screen can say so itself. Reported
        // in the hint line and in the diagnostic readout rather than only in the
        // console: this screen is the one thing the user is looking at when it goes
        // wrong, and a screenshot of its own sentence is worth more than a
        // description of the symptom.
        var failures = []
        var noteFailure = function (clip, reason) {
          failures.push(clip.name + '(' + reason + ')')
          namespace.failures = failures.join(' ')
        }

        // The bound the first-frame watchdogs could not be: once the picture is up,
        // `advance` is disarmed and nothing else in this closure can release the
        // screen except the clip's own `ended`. Armed at reveal, stopped by
        // `enter()`, by `ended`, by `error`, and by the pool running dry.
        //
        // It hands the screen over rather than calling tryNext(). tryNext() returns
        // early once `settled` is set — and reveal() does too — so a replacement
        // clip would play behind an opacity of 0, which is the freeze we are here to
        // avoid rather than the cure. For a screen that is only decoration the
        // choice is between showing the app and showing a stopped frame.
        //
        // Not armed in click mode: there the press is the release, by design, and a
        // clip that is merely buffering must not take that decision away.
        var armStallWatch = function (video, clip) {
          stopStallWatch()
          if (ENTER_MODE === 'click') return
          lastProgress = Date.now()
          stallWatch = globalThis.setInterval(function () {
            if (clipDone || video.ended) { stopStallWatch(); return }
            if (Date.now() - lastProgress < STALL_LIMIT_MS) return
            stopStallWatch()
            noteFailure(clip, 'stalled')
            enter()
          }, 1000)
        }

        var tryNext = function () {
          if (settled || attempt >= order.length) {
            // Every candidate failed. The gradient and the hint remain, so the
            // screen still works; only the artwork is missing. The hand-off is
            // still released, because a pool that cannot play anything is not a
            // reason to hold a user in front of a gradient — they can also leave
            // at any time with a press.
            if (!settled && parts.root.getAttribute('data-state') !== 'leaving') {
              parts.hint.textContent = failures.length === 0
                ? '片段无法播放 · 就绪后自动进入'
                : '片段无法播放 ' + failures.join(' ') + ' · 就绪后自动进入'
            }
            clipDone = true
            maybeEnter()
            return
          }
          var clip = order[attempt]
          attempt += 1
          cache.current = clip

          // A fresh element per attempt: a failed source leaves an element in an
          // error state that a later load on the same element does not clear.
          var video = document.createElement('video')
          var current = parts.video()
          video.className = current.className
          // See the note in build(): a looping clip never reports its own end,
          // and the end of the clip is what triggers the hand-off.
          video.loop = ENTER_MODE === 'click'
          video.playsInline = true
          video.setAttribute('playsinline', '')
          video.preload = 'auto'
          if (current.parentNode) current.parentNode.replaceChild(video, current)
          parts.replaceVideo(video)

          var advance = globalThis.setTimeout(function () {
            // The clip was given its six seconds and never showed anything. Say so
            // before moving on: "skipped silently" is indistinguishable from "the
            // whole screen is broken" when all you can see is a gradient.
            noteFailure(clip, 'no-frame')
            tryNext()
          }, 6000)
          // Armed only for a clip whose duration cannot be known; see below.
          var endless = null
          var reveal = function () {
            if (settled) return
            settled = true
            globalThis.clearTimeout(advance)
            armStallWatch(video, clip)
            // The fade is driven by an inline style rather than a CSS rule: an
            // inline value cannot lose a specificity contest with anything else on
            // the page. Written only once a frame has actually been presented —
            // see whenFramePresents for why a resolved play() is not that moment.
            video.style.opacity = '1'
            video.setAttribute('data-shown', '1')
            // Only while the clip is still the thing being watched. Once it has
            // ended, the hint belongs to the hand-off — a late frame arriving after
            // the end must not overwrite "waiting for the kernel to be ready".
            if (!namespace.failed && !clipDone) {
              parts.hint.textContent = namespace.audioBlocked === null
                ? HINT_SOUND
                : HINT_SILENT
            }
          }
          // The watchdog above stays armed until this fires. That is the whole
          // point: a clip that starts but never paints must be skipped, not
          // waited on — and it says which one it was.
          whenFramePresents(video, reveal)
          video.addEventListener('error', function () {
            globalThis.clearTimeout(advance)
            globalThis.clearTimeout(endless)
            stopStallWatch()
            var code = video.error ? video.error.code : 0
            noteFailure(clip, 'err' + String(code))
            tryNext()
          }, { once: true })

          // The clip's own end is the hand-off signal, and it works for any
          // length: a 8-second clip and a 15-second clip each fire this when they
          // are done, so nothing here has to know or care how long the clip is.
          video.addEventListener('ended', function () {
            globalThis.clearTimeout(endless)
            stopStallWatch()
            namespace.clipEndedAt = Date.now()
            clipDone = true
            maybeEnter()
          }, { once: true })

          // ...but a clip whose length is unknown never reports an end at all.
          // `duration` is Infinity for a MediaRecorder WebM, and `ended` on such
          // an element may never fire, so an unbounded wait would hold the screen
          // indefinitely. This is the only fallback for that case, and it is
          // armed only when the duration is genuinely unknowable.
          video.addEventListener('loadedmetadata', function () {
            if (Number.isFinite(video.duration)) return
            namespace.unknownLength = true
            endless = globalThis.setTimeout(function () {
              clipDone = true
              maybeEnter()
            }, ENDLESS_MS)
          }, { once: true })
          // The heartbeat the stall watchdog reads. Deliberately NOT bumped by
          // `stalled` / `waiting` below: those events are the clock stopping, and
          // treating them as progress would disarm the very thing watching for it.
          video.addEventListener('timeupdate', function () {
            lastProgress = Date.now()
          })
          video.addEventListener('playing', function () {
            lastProgress = Date.now()
          })

          // A stall is the difference between "the clip ended" and "the clip is
          // waiting for bytes". Recording it is what makes a freeze reportable
          // instead of guessed at, and the diagnostic line prints it.
          video.addEventListener('stalled', function () {
            namespace.lastStall = Date.now()
          })
          video.addEventListener('waiting', function () {
            namespace.lastStall = Date.now()
          })

          video.src = clip.src

          startClip(video, function () {
            // Playback started. Deliberately does NOT reveal: leaving the paused
            // state is not the same fact as having a frame to show, and revealing
            // here is what used to disarm the watchdog before any picture existed.
          }, function () {
            // Neither unmuted nor muted playback started: move to the next clip.
            globalThis.clearTimeout(advance)
            globalThis.clearTimeout(endless)
            tryNext()
          })

          // Aim the dissolve at the clip's last frame.
          //
          // The exit used to begin when the clip ENDED, which meant the picture sat
          // on a frozen final frame for the whole fade. What is wanted is a
          // crossfade: the clip starts dissolving into the app FADE_MS before it
          // is over, so a 15-second clip dissolves from 13s and both are done at
          // 15s. That needs the clip's remaining time, not a fixed schedule.
          //
          // The trigger is a per-frame check rather than one timer computed at
          // load time, because a single scheduled timeout drifts the moment
          // playback stalls — and "lands exactly on the last frame" is the entire
          // property being bought here.
          var tailEntered = false
          namespace.tailEntered = false
          var tailCheck = function () {
            if (tailEntered || !settled) return
            if (parts.video() !== video) return
            if (parts.root.getAttribute('data-state') === 'leaving') { tailEntered = true; return }
            // An unknown length is the ENDLESS timer's problem, not this one.
            if (!Number.isFinite(video.duration)) return
            // Too short to carry the dissolve: it would have to start before the
            // picture is even up. Those play out and fade afterwards instead.
            if (video.duration * 1000 < TAIL_MIN_MS) return
            if (video.ended || video.paused) return
            // The dissolve is the moment the app becomes visible, so it may only
            // start once the app can actually be shown. A slow kernel simply keeps
            // the clip playing past its end; `maybeEnter` takes over from there.
            if (namespace.bootedAt === null) return
            var remaining = (video.duration - video.currentTime) * 1000
            if (remaining > FADE_MS || remaining <= 0) return
            tailEntered = true
            namespace.tailEntered = true
            enter(remaining, true)
          }
          var tailFrame = function () {
            tailCheck()
            if (!tailEntered && parts.video() === video) nextFrame(tailFrame)
          }
          // Only `tail` mode dissolves against the clip's own clock. The other two
          // have nothing to aim at, so the loop is never started at all rather
          // than started and immediately declined.
          if (ENTER_MODE === 'tail') {
            nudgeTail = tailCheck
            nextFrame(tailFrame)
            // The backstop for the state rAF cannot cover: a background tab
            // throttles frames, and media time keeps moving while they are gone.
            video.addEventListener('timeupdate', tailCheck)
          }
        }

        tryNext()
      })
      .catch(function () { /* an unreachable pool leaves the gradient */ })
  }

  if (document.body) mount()
  else document.addEventListener('DOMContentLoaded', mount, { once: true })
})()
