const express = require('express')
const router = express.Router() 
const Book = require('../models/book')

router.get('/', async (req, res) => {

  let query = Book.find()
  if (req.query.title != null && req.query.title != '') {
    query = query.regex('title', new RegExp(req.query.title, 'i'))
  }
    try {
        const books = await query.exec()
        res.render('books/rv', {
          books: books,
          searchOptions: req.query
        })
      } catch {
        res.redirect('/')
      }
  
  })

router.get('/new', async (req, res) => {
    renderNewPage(res, new Book())
  
})

router.post('/', async (req, res) => {
    const book = new Book({
        title: req.body.title,
        description: req.body.description
      })
      try {
        const newBook = await book.save()
        // res.redirect(`books/${newBook.id}`)
        res.redirect(`/user`)
      } catch {
       
        renderNewPage(res, book, true)
      }

  })

async function renderNewPage(res, book, hasError = false) {
    try {
  
      const params = {
        book: book
      }
      if (hasError) params.errorMessage = 'Error Creating Book'
      res.render('books/new', params)
    } catch {
      res.redirect('/books')
    }
  }
  

module.exports = router