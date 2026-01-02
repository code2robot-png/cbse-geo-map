FROM python:3.11-slim

WORKDIR /app

COPY app/ /app/app/
COPY www/ /app/www/
COPY requirements.txt /app/

RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8080

CMD ["gunicorn", "-b", ":8080", "app.main:app"]
