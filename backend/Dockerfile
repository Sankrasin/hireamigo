# Use the official Python 3.9 image
FROM python:3.9-slim

# Set the working directory to /app
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install the dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Create a non-root user (Hugging Face Spaces requirement for security)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Change working directory to the user's home to avoid permission issues
WORKDIR $HOME/app
COPY --chown=user . $HOME/app

# Expose the port FastAPI runs on
EXPOSE 7860

# Command to run the application (Hugging Face spaces expose port 7860 by default)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
