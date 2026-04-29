import React, { useState } from 'react';
import './AddBook.css';
import FormCard from '../common/FormCard';
import FormInput from '../common/FormInput';

const AddBook = ({ books, setBooks, setActiveNav }) => {
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.title.trim() || !formData.author.trim() || !formData.genre.trim()) {
           alert("The Archive requires a complete Title, Author, and Genre before shelving.");
           return;
        }

        const newBookData = {
            title: formData.title,
            author: formData.author,
            genre: formData.genre,
            status: 'wishlist',
            progress: '0 / 0 pages',
            coverImage: preview || null
        };
        
        try {
            const { bookService } = await import('../../services/api');
            const response = await bookService.addBook(newBookData);
            setBooks([...books, response.data]);
            
            alert(`Book "${formData.title}" added to your library!`);
            setFormData({ title: '', author: '', genre: '', cover: null });
            setPreview(null);
            if (setActiveNav) {
                setActiveNav('Library');
            }
        } catch (error) {
            console.error("Failed to add book", error);
            alert("Failed to add book to the archive.");
        }
    };

    return (
        <FormCard 
            title="ADD NEW TOME" 
            subtitle="CATALOG" 
            quote="A room without books is like a body without a soul." 
            author="MARCUS TULLIUS CICERO"
            headerIcon="⊕"
            containerClass="ab-container"
        >
            <form className="ab-form" onSubmit={handleSubmit}>
                <FormInput
                    label="Book Title"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="e.g. The Picture of Dorian Gray"
                />

                <FormInput
                    label="Author Name"
                    name="author"
                    value={formData.author}
                    onChange={handleChange}
                    placeholder="e.g. Oscar Wilde"
                />

                <FormInput
                    label="Genre"
                    name="genre"
                    value={formData.genre}
                    onChange={handleChange}
                    placeholder="e.g. Gothic Fiction"
                />

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
        </FormCard>
    );
};

export default AddBook;
