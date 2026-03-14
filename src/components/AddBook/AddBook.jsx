import React, { useState } from 'react';
import './AddBook.css';

const AddBook = () => {
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        genre: '',
        cover: null
    });
    const [preview, setPreview] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setFormData({ ...formData, cover: file });
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        alert(`Book "${formData.title}" added to your library!`);
        setFormData({ title: '', author: '', genre: '', cover: null });
        setPreview(null);
    };

    return (
        <div className="ab-container">
            <div className="ab-header">
                <span>⊕ ADD NEW TOME</span>
                <span>CATALOG</span>
            </div>

            <form className="ab-form" onSubmit={handleSubmit}>
                <div className="ab-form-group">
                    <label className="ab-label">Book Title</label>
                    <div className="ab-input-wrapper">
                        <input
                            type="text"
                            name="title"
                            className="ab-input"
                            value={formData.title}
                            onChange={handleChange}
                            required
                        />
                        {!formData.title && <span className="ab-placeholder">e.g. The Picture of Dorian Gray</span>}
                    </div>
                </div>

                <div className="ab-form-group">
                    <label className="ab-label">Author Name</label>
                    <div className="ab-input-wrapper">
                        <input
                            type="text"
                            name="author"
                            className="ab-input"
                            value={formData.author}
                            onChange={handleChange}
                            required
                        />
                        {!formData.author && <span className="ab-placeholder">e.g. Oscar Wilde</span>}
                    </div>
                </div>

                <div className="ab-form-group">
                    <label className="ab-label">Genre</label>
                    <div className="ab-input-wrapper">
                        <input
                            type="text"
                            name="genre"
                            className="ab-input"
                            value={formData.genre}
                            onChange={handleChange}
                            required
                        />
                        {!formData.genre && <span className="ab-placeholder">e.g. Gothic Fiction</span>}
                    </div>
                </div>

                <div className="ab-form-group">
                    <label className="ab-label">Book Cover</label>
                    <div className="ab-file-wrapper">
                        <input
                            type="file"
                            name="cover"
                            className="ab-input-file"
                            onChange={handleFileChange}
                            accept="image/*"
                            required
                            id="book-cover-input"
                        />
                        <label htmlFor="book-cover-input" className="ab-file-label">
                           {formData.cover ? formData.cover.name : "Choose an image file..."}
                        </label>
                        {preview && (
                            <div className="ab-preview-wrap">
                                <img src={preview} alt="Preview" className="ab-preview-img" />
                            </div>
                        )}
                    </div>
                </div>

                <button type="submit" className="ab-submit">
                    SHELVE BOOK
                </button>
            </form>

            <div className="ab-quote">
                <span className="ab-quote-text">"A room without books is like a body without a soul."</span>
                <span className="ab-quote-author">— MARCUS TULLIUS CICERO</span>
            </div>
        </div>
    );
};

export default AddBook;
