const express = require("express");
const router = express.Router();
const auth = require("../../middleware/auth");
const { check, validationResult } = require("express-validator");
const User = require("../../models/User");
const Profile = require("../../models/Profile");
const Post = require("../../models/Post");

//
// @route    POST api/posts
// @desc     Create a post
// @access   Pritvate
router.post(
  "/",
  [
    auth,
    [
      check("text", "Text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select("-password");

      const newPost = new Post({
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      });

      const post = await newPost.save();

      res.json(post);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

//
// @route    GET api/posts
// @desc     Get all posts
// @access   Private
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//
// @route    GET api/posts/:id
// @desc     Get a post by its id
// @access   Private
router.get("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "No Post found" });

    res.json(post);
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectID")
      return res.status(404).json({ error: "No Post found" });
    res.status(500).send("Server error");
  }
});

//
// @route    DELETE api/posts/:id
// @desc     Delete a post by its id
// @access   Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ error: "No Post found" });

    //check user is same
    if (post.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: "user not authorized" });
    }

    await post.remove();

    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    if (err.kind === "ObjectID")
      return res.status(404).json({ error: "No Post found" });
    res.status(500).send("Server error");
  }
});

//
// @route    PUT api/posts/like/:id
// @desc     Like a post
// @access   Private

router.put("/like/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const loggedInUser = req.user.id;

    //check if post has already been liked by user
    if (
      post.likes.filter(like => like.user.toString() === loggedInUser).length >
      0
    ) {
      return res.status(400).json({ msg: "User already liked this post" });
    }

    post.likes.unshift({ user: loggedInUser });

    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//
// @route    PUT api/posts/unlike/:id
// @desc     Unlike a post
// @access   Private

router.put("/unlike/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const loggedInUser = req.user.id;

    //check if post has been liked by user
    if (
      post.likes.filter(like => like.user.toString() === loggedInUser)
        .length === 0
    ) {
      return res
        .status(400)
        .json({ msg: "Cant unlike a post you havent liked" });
    }

    //get remove index

    const removeIndex = post.likes
      .map(like => like.user.toString())
      .indexOf(loggedInUser);

    post.likes.splice(removeIndex, 1);

    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

//
// @route    POST api/posts/comment/:id
// @desc     Comment on a post
// @access   Pritvate
router.post(
  "/comment/:id",
  [
    auth,
    [
      check("text", "Text is required")
        .not()
        .isEmpty()
    ]
  ],
  async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const user = await User.findById(req.user.id).select("-password");
      const post = await Post.findById(req.params.id);

      if (!post) return res.status(404).json({ error: "No Post found" });

      const newComment = {
        text: req.body.text,
        name: user.name,
        avatar: user.avatar,
        user: req.user.id
      };

      post.comments.unshift(newComment);
      await post.save();
      res.json(post.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send("Server error");
    }
  }
);

//
// @route    DELETE api/posts/comment/:id
// @desc     delete a comment on a post
// @access   Pritvate
router.delete("/comment/:id/:comment_id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const loggedInUser = req.user.id;

    //pull out comment
    const comment = post.comments.find(
      comment => (comment.id = req.params.comment_id)
    );

    //check if comment exists
    if (!comment) {
      return res.status(404).json({ msg: "Comment doesnt exist" });
    }

    //check if user made the comment
    if (comment.user.toString() !== loggedInUser) {
      return res.status(400).json({ msg: "Not authorized to deleet comment" });
    }

    // get index of comment
    const removeIndex = post.comments
      .map(comment => comment.user.toString())
      .indexOf(loggedInUser);

    post.comments.splice(removeIndex, 1);
    await post.save();
    res.json(post.comments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

module.exports = router;
