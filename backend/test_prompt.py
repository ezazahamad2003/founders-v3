"""Test script to verify the Scopic Legal prompt implementation."""

from app.prompts import get_system_prompt, SCOPIC_LEGAL_SYSTEM_PROMPT, LEGACY_SYSTEM_PROMPT


def test_prompts():
    """Test the prompt retrieval functions."""
    
    print("=" * 80)
    print("SCOPIC LEGAL PROMPT IMPLEMENTATION TEST")
    print("=" * 80)
    
    # Test 1: Default/Adaptive Prompt
    print("\n1. Testing default (adaptive) prompt:")
    print("-" * 80)
    default_prompt = get_system_prompt()
    print(f"Length: {len(default_prompt)} characters")
    print(f"First 100 chars: {default_prompt[:100]}...")
    assert default_prompt == SCOPIC_LEGAL_SYSTEM_PROMPT
    print("✓ Default prompt matches SCOPIC_LEGAL_SYSTEM_PROMPT")
    
    # Test 2: Explicit Adaptive Mode
    print("\n2. Testing explicit 'default' mode:")
    print("-" * 80)
    adaptive_prompt = get_system_prompt(mode="default")
    assert adaptive_prompt == SCOPIC_LEGAL_SYSTEM_PROMPT
    print("✓ Adaptive mode returns correct prompt")
    
    # Test 3: Legacy Prompt
    print("\n3. Testing legacy prompt:")
    print("-" * 80)
    legacy_prompt = get_system_prompt(mode="legacy")
    print(f"Length: {len(legacy_prompt)} characters")
    print(f"Content: {legacy_prompt}")
    assert legacy_prompt == LEGACY_SYSTEM_PROMPT
    print("✓ Legacy mode returns correct prompt")
    
    # Test 4: Verify Prompt Content
    print("\n4. Verifying adaptive prompt content:")
    print("-" * 80)
    required_sections = [
        "Scopic Legal",
        "Response Style Rules",
        "Short + Direct",
        "Long + Detailed",
        "Guidance-Style Behavior",
        "Stay Up to Date",
        "Tone",
    ]
    
    for section in required_sections:
        if section in SCOPIC_LEGAL_SYSTEM_PROMPT:
            print(f"✓ Contains section: '{section}'")
        else:
            print(f"✗ Missing section: '{section}'")
            raise AssertionError(f"Missing required section: {section}")
    
    # Test 5: Verify Key Behaviors
    print("\n5. Verifying key behavioral instructions:")
    print("-" * 80)
    key_behaviors = [
        "2–5 crisp sentences",
        "draft",
        "write",
        "generate",
        "Purpose",
        "Outcome",
        "Jurisdiction",
        "2024–2025",
        "Professional",
        "No unnecessary fluff",
    ]
    
    for behavior in key_behaviors:
        if behavior in SCOPIC_LEGAL_SYSTEM_PROMPT:
            print(f"✓ Contains behavior: '{behavior}'")
        else:
            print(f"✗ Missing behavior: '{behavior}'")
            raise AssertionError(f"Missing required behavior: {behavior}")
    
    print("\n" + "=" * 80)
    print("ALL TESTS PASSED ✓")
    print("=" * 80)
    
    # Display full prompt
    print("\n6. Full Adaptive Prompt:")
    print("-" * 80)
    print(SCOPIC_LEGAL_SYSTEM_PROMPT)
    print("-" * 80)


if __name__ == "__main__":
    test_prompts()
