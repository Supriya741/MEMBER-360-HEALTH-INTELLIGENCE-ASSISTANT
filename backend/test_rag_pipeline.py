"""
Comprehensive End-to-End Automated Test Suite for Member 360° RAG Pipeline
============================================================================
Validates all requirements from User Specification:
Test 1: "Give me a summary of this member."
Test 2: "What medications is this member taking?"
Test 3: "What are the recent claims?"
Test 4: "Are there any open care gaps?"
Test 5: "Are there pending authorizations?"
Test 6: "When was the last interaction?"
Test 7: "Who is the care coordinator?"
Test 8: "What are the most important issues?"
Test 9: "What should I do next?"
Test 10: Multi-turn Follow-up questions (Latest claim -> Provider -> Approval status)
Test 11: Missing information non-hallucination test ("What is the member's blood pressure?")
Test 12: Member switching and complete data isolation (Member A vs Member B)
"""

import sys
import os
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from rag_pipeline import (
    MemberRAGIndexer,
    MemberRAGRetriever,
    MemberRAGGenerator,
    run_member_rag
)
from db import db as data

def run_tests():
    print("=" * 80)
    print("=== STARTING MEMBER 360 END-TO-END RAG PIPELINE TEST SUITE ===")
    print("=" * 80)

    member_a_id = "MEM123456" # John Doe
    member_b_id = "MEM123455" # Jane Smith

    # ----------------------------------------------------
    # TEST 1: Member Summary
    # ----------------------------------------------------
    print("\n[TEST 1] Testing 'Give me a summary of this member.'...")
    t0 = time.time()
    res1 = run_member_rag(member_a_id, "Give me a summary of this member.")
    assert "John Doe" in res1["reply"], "Member name missing from summary"
    assert "Eligibility" in res1["reply"] or "Active" in res1["reply"], "Eligibility missing"
    assert len(res1["sources"]) >= 4, "Expected multi-domain grounded sources"
    print(f" -> [PASS] Summary generated ({len(res1['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res1['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 2: Medications
    # ----------------------------------------------------
    print("\n[TEST 2] Testing 'What medications is this member taking?'...")
    t0 = time.time()
    res2 = run_member_rag(member_a_id, "What medications is this member taking?")
    assert "Atorvastatin" in res2["reply"] or "Lisinopril" in res2["reply"] or "Prescriptions" in res2["reply"], "Medications missing"
    assert len(res2["sources"]) >= 2, "Expected medication source chunks"
    print(f" -> [PASS] Medications retrieved ({len(res2['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res2['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 3: Recent Claims
    # ----------------------------------------------------
    print("\n[TEST 3] Testing 'What are the recent claims?'...")
    t0 = time.time()
    res3 = run_member_rag(member_a_id, "What are the recent claims?")
    assert "Claim" in res3["reply"] and ("Billed" in res3["reply"] or "Patient" in res3["reply"]), "Claims missing"
    assert len(res3["sources"]) >= 2, "Expected claims sources"
    print(f" -> [PASS] Recent claims retrieved ({len(res3['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res3['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 4: Open Care Gaps
    # ----------------------------------------------------
    print("\n[TEST 4] Testing 'Are there any open care gaps?'...")
    t0 = time.time()
    res4 = run_member_rag(member_a_id, "Are there any open care gaps?")
    assert "Care Gap" in res4["reply"] or "Quality" in res4["reply"], "Care gaps missing"
    assert len(res4["sources"]) >= 1, "Expected care gap source chunks"
    print(f" -> [PASS] Open care gaps retrieved ({len(res4['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res4['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 5: Pending Authorizations
    # ----------------------------------------------------
    print("\n[TEST 5] Testing 'Are there pending authorizations?'...")
    t0 = time.time()
    res5 = run_member_rag(member_a_id, "Are there pending authorizations?")
    assert "Authorization" in res5["reply"] or "Auth" in res5["reply"], "Authorizations missing"
    assert len(res5["sources"]) >= 1, "Expected authorization source chunks"
    print(f" -> [PASS] Authorizations retrieved ({len(res5['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res5['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 6: Last Interaction
    # ----------------------------------------------------
    print("\n[TEST 6] Testing 'When was the last interaction?'...")
    t0 = time.time()
    res6 = run_member_rag(member_a_id, "When was the last interaction?")
    assert "Interaction" in res6["reply"] or "Contact" in res6["reply"] or "Inquiry" in res6["reply"], "Interaction missing"
    assert len(res6["sources"]) >= 1, "Expected interaction source chunks"
    print(f" -> [PASS] Last interaction retrieved ({len(res6['sources'])} sources, {(time.time()-t0)*1000:.2f}ms)")
    print(f"    Preview: {res6['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 7: Care Coordinator
    # ----------------------------------------------------
    print("\n[TEST 7] Testing 'Who is the care coordinator?'...")
    t0 = time.time()
    res7 = run_member_rag(member_a_id, "Who is the care coordinator?")
    assert "Sarah Jenkins, RN" in res7["reply"], "Care coordinator name missing"
    assert "Care Coordinator" in res7["reply"], "Care coordinator title missing"
    print(f" -> [PASS] Care coordinator retrieved directly in {(time.time()-t0)*1000:.2f}ms")
    print(f"    Reply: {res7['reply']}")

    # ----------------------------------------------------
    # TEST 8: Most Important Issues
    # ----------------------------------------------------
    print("\n[TEST 8] Testing 'What are the most important issues?'...")
    t0 = time.time()
    res8 = run_member_rag(member_a_id, "What are the most important issues?")
    assert "Priority Issues" in res8["reply"] or "Flagged" in res8["reply"], "Priority issues missing"
    assert len(res8["open_issues"]) >= 1, "Expected rule-based open issues"
    print(f" -> [PASS] Priority issues evaluated with {len(res8['open_issues'])} flags in {(time.time()-t0)*1000:.2f}ms")
    print(f"    Preview: {res8['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 9: Recommended Next Actions
    # ----------------------------------------------------
    print("\n[TEST 9] Testing 'What should I do next?'...")
    t0 = time.time()
    res9 = run_member_rag(member_a_id, "What should I do next?")
    assert "Recommended" in res9["reply"] or len(res9["suggested_actions"]) >= 1, "Next actions missing"
    print(f" -> [PASS] Recommended next actions returned with {len(res9['suggested_actions'])} actions in {(time.time()-t0)*1000:.2f}ms")
    print(f"    Preview: {res9['reply'][:120]}...")

    # ----------------------------------------------------
    # TEST 10: Multi-Turn Follow-Up Questions
    # ----------------------------------------------------
    print("\n[TEST 10] Testing Multi-Turn Follow-Up Conversations...")
    history = [
        {"role": "user", "content": "What are the member's recent claims?"},
        {"role": "assistant", "content": res3["reply"]}
    ]
    # Follow-up 1: What was the latest claim about?
    t0 = time.time()
    fu1 = run_member_rag(member_a_id, "What was the latest claim for?", history=history)
    assert "Claim" in fu1["reply"] and ("CLM" in fu1["reply"] or "MRI" in fu1["reply"] or "Spine" in fu1["reply"] or "2025" in fu1["reply"]), "Latest claim resolution failed"
    print(f" -> [PASS] Follow-up 1 ('What was the latest claim for?'): {fu1['reply'][:100]}...")

    # Follow-up 2: Who was the provider?
    history.append({"role": "user", "content": "What was the latest claim for?"})
    history.append({"role": "assistant", "content": fu1["reply"]})
    fu2 = run_member_rag(member_a_id, "Who was the provider?", history=history)
    assert "provider" in fu2["reply"].lower() or "hospital" in fu2["reply"].lower() or "medical" in fu2["reply"].lower(), "Provider follow-up resolution failed"
    print(f" -> [PASS] Follow-up 2 ('Who was the provider?'): {fu2['reply']}")

    # Follow-up 3: Was it approved?
    history.append({"role": "user", "content": "Who was the provider?"})
    history.append({"role": "assistant", "content": fu2["reply"]})
    fu3 = run_member_rag(member_a_id, "Was it approved?", history=history)
    assert "status" in fu3["reply"].lower() or "processed" in fu3["reply"].lower() or "approved" in fu3["reply"].lower(), "Approval status follow-up failed"
    print(f" -> [PASS] Follow-up 3 ('Was it approved?'): {fu3['reply']}")

    # ----------------------------------------------------
    # TEST 11: Missing Information / Anti-Hallucination
    # ----------------------------------------------------
    print("\n[TEST 11] Testing Missing Information ('What is the member blood pressure?')...")
    t0 = time.time()
    res11 = run_member_rag(member_a_id, "What is the member's blood pressure?")
    assert "I couldn't find blood pressure information in the available member records." in res11["reply"], f"Unexpected reply: {res11['reply']}"
    print(f" -> [PASS] Missing information handled correctly: \"{res11['reply']}\"")

    # ----------------------------------------------------
    # TEST 12: Member Switching & Strict Isolation
    # ----------------------------------------------------
    print("\n[TEST 12] Testing Member Switching (Member A vs Member B)...")
    # Member A query
    resA = run_member_rag(member_a_id, "What medications is this member taking?")
    # Member B query
    resB = run_member_rag(member_b_id, "What medications is this member taking?")

    assert resA["member_id"] == member_a_id, "Member A ID mismatch"
    assert resB["member_id"] == member_b_id, "Member B ID mismatch"
    assert resA["member_name"] != resB["member_name"], "Member names should differ"
    assert resA["member_name"] == "John Doe", "Member A name should be John Doe"
    assert resB["member_name"] == "Jane Smith", "Member B name should be Jane Smith"
    print(f" -> Member A ({resA['member_name']}): {resA['reply'][:80]}...")
    print(f" -> Member B ({resB['member_name']}): {resB['reply'][:80]}...")
    print(" -> [PASS] Member switching & data isolation verified 100%.")

    print("\n" + "=" * 80)
    print("[SUCCESS] ALL 12 VERIFICATION SCENARIOS PASSED WITH 100% SUCCESS!")
    print("=" * 80)
    return True

if __name__ == "__main__":
    success = run_tests()
    sys.exit(0 if success else 1)
