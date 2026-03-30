"""
test_chat.py
Simple test script to demonstrate the chat-based AI slop fixer.
"""

import requests
import json

# Test with the NDA chat conversation
def test_nda():
    with open("public/nda.txt", "r", encoding="utf-8") as f:
        chat_text = f.read()
    
    response = requests.post(
        "http://localhost:8000/fix-chat-slop",
        json={
            "chat_text": chat_text,
            "document_type": "nda"
        }
    )
    
    if response.status_code == 200:
        with open("output_nda.docx", "wb") as f:
            f.write(response.content)
        print("✓ NDA generated successfully: output_nda.docx")
    else:
        print(f"✗ NDA failed: {response.status_code}")
        print(response.text)


# Test with the Exit Agreement chat conversation
def test_exit():
    with open("public/exitandrelease.txt", "r", encoding="utf-8") as f:
        chat_text = f.read()
    
    response = requests.post(
        "http://localhost:8000/fix-chat-slop",
        json={
            "chat_text": chat_text,
            "document_type": "exit"
        }
    )
    
    if response.status_code == 200:
        with open("output_exit.docx", "wb") as f:
            f.write(response.content)
        print("✓ Exit Agreement generated successfully: output_exit.docx")
    else:
        print(f"✗ Exit Agreement failed: {response.status_code}")
        print(response.text)


# Test with the Stock Options chat conversation
def test_stock_options():
    with open("public/stockoptions.txt", "r", encoding="utf-8") as f:
        chat_text = f.read()
    
    response = requests.post(
        "http://localhost:8000/fix-chat-slop",
        json={
            "chat_text": chat_text,
            "document_type": "stock_options"
        }
    )
    
    if response.status_code == 200:
        with open("output_stock_options.docx", "wb") as f:
            f.write(response.content)
        print("✓ Stock Options Agreement generated successfully: output_stock_options.docx")
    else:
        print(f"✗ Stock Options Agreement failed: {response.status_code}")
        print(response.text)


# Test auto-detection
def test_auto_detect():
    with open("public/nda.txt", "r", encoding="utf-8") as f:
        chat_text = f.read()
    
    response = requests.post(
        "http://localhost:8000/fix-chat-slop",
        json={
            "chat_text": chat_text
            # No document_type specified - should auto-detect
        }
    )
    
    if response.status_code == 200:
        with open("output_auto_detect.docx", "wb") as f:
            f.write(response.content)
        print("✓ Auto-detect successful: output_auto_detect.docx")
    else:
        print(f"✗ Auto-detect failed: {response.status_code}")
        print(response.text)


if __name__ == "__main__":
    print("Testing Chat-based AI Slop Fixer\n")
    print("=" * 50)
    
    print("\n1. Testing NDA generation...")
    test_nda()
    
    print("\n2. Testing Exit Agreement generation...")
    test_exit()
    
    print("\n3. Testing Stock Options generation...")
    test_stock_options()
    
    print("\n4. Testing auto-detection...")
    test_auto_detect()
    
    print("\n" + "=" * 50)
    print("Tests complete!")
